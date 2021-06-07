/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './app.scss';
import { METRIC_TYPE } from '@kbn/analytics';

import { isEqual, partition } from 'lodash';
import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { Toast } from 'kibana/public';
import { VisualizeFieldContext } from 'src/plugins/ui_actions/public';
import { EuiBreadcrumb } from '@elastic/eui';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../../../../src/plugins/kibana_utils/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { checkForDuplicateTitle } from '../../../../../src/plugins/saved_objects/public';
import { injectFilterReferences } from '../persistence';
import { trackUiEvent } from '../lens_ui_telemetry';
import { esFilters, syncQueryStateWithUrl } from '../../../../../src/plugins/data/public';
import { getFullPath, APP_ID } from '../../common';
import { LensAppProps, LensAppServices, RunSave } from './types';
import { LensTopNavMenu } from './lens_top_nav';
import { Document } from '../persistence';
import { SaveModal } from './save_modal';
import {
  LensByReferenceInput,
  LensEmbeddableInput,
} from '../editor_frame_service/embeddable/embeddable';
import { EditorFrameInstance } from '../types';
import {
  setState as setAppState,
  useLensSelector,
  useLensDispatch,
  LensAppState,
  DispatchSetState,
} from '../state_management';

export function App({
  history,
  onAppLeave,
  redirectTo,
  editorFrame,
  initialInput,
  incomingState,
  redirectToOrigin,
  redirectToDashboard,
  setHeaderActionMenu,
  initialContext,
}: LensAppProps) {
  const {
    data,
    chrome,
    overlays,
    uiSettings,
    application,
    stateTransfer,
    notifications,
    usageCollection,
    attributeService,
    savedObjectsClient,
    savedObjectsTagging,
    getOriginatingAppName,

    // Temporarily required until the 'by value' paradigm is default.
    dashboardFeatureFlag,
  } = useKibana<LensAppServices>().services;

  const dispatch = useLensDispatch();
  const dispatchSetState: DispatchSetState = useCallback(
    (state: Partial<LensAppState>) => dispatch(setAppState(state)),
    [dispatch]
  );

  const appState = useLensSelector((state) => state.app);

  // Used to show a popover that guides the user towards changing the date range when no data is available.
  const [indicateNoData, setIndicateNoData] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const { lastKnownDoc } = appState;

  const showNoDataPopover = useCallback(() => {
    setIndicateNoData(true);
  }, [setIndicateNoData]);

  useEffect(() => {
    if (indicateNoData) {
      setIndicateNoData(false);
    }
  }, [
    setIndicateNoData,
    indicateNoData,
    appState.indexPatternsForTopNav,
    appState.searchSessionId,
  ]);

  const onError = useCallback(
    (e: { message: string }) =>
      notifications.toasts.addDanger({
        title: e.message,
      }),
    [notifications.toasts]
  );

  const getIsByValueMode = useCallback(
    () =>
      Boolean(
        // Temporarily required until the 'by value' paradigm is default.
        dashboardFeatureFlag.allowByValueEmbeddables &&
          appState.isLinkedToOriginatingApp &&
          !(initialInput as LensByReferenceInput)?.savedObjectId
      ),
    [dashboardFeatureFlag.allowByValueEmbeddables, appState.isLinkedToOriginatingApp, initialInput]
  );

  useEffect(() => {
    const kbnUrlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(notifications.toasts),
    });
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
      data.query,
      kbnUrlStateStorage
    );

    return () => {
      stopSyncingQueryServiceStateWithUrl();
    };
  }, [data.search.session, notifications.toasts, uiSettings, data.query, history]);

  useEffect(() => {
    onAppLeave((actions) => {
      // Confirm when the user has made any changes to an existing doc
      // or when the user has configured something without saving
      if (
        application.capabilities.visualize.save &&
        !isEqual(
          appState.persistedDoc?.state,
          getLastKnownDocWithoutPinnedFilters(lastKnownDoc)?.state
        ) &&
        (appState.isSaveable || appState.persistedDoc)
      ) {
        return actions.confirm(
          i18n.translate('xpack.lens.app.unsavedWorkMessage', {
            defaultMessage: 'Leave Lens with unsaved work?',
          }),
          i18n.translate('xpack.lens.app.unsavedWorkTitle', {
            defaultMessage: 'Unsaved changes',
          })
        );
      } else {
        return actions.default();
      }
    });
  }, [
    onAppLeave,
    lastKnownDoc,
    appState.isSaveable,
    appState.persistedDoc,
    application.capabilities.visualize.save,
  ]);

  // Sync Kibana breadcrumbs any time the saved document's title changes
  useEffect(() => {
    const isByValueMode = getIsByValueMode();
    const breadcrumbs: EuiBreadcrumb[] = [];
    if (appState.isLinkedToOriginatingApp && getOriginatingAppName() && redirectToOrigin) {
      breadcrumbs.push({
        onClick: () => {
          redirectToOrigin();
        },
        text: getOriginatingAppName(),
      });
    }
    if (!isByValueMode) {
      breadcrumbs.push({
        href: application.getUrlForApp('visualize'),
        onClick: (e) => {
          application.navigateToApp('visualize', { path: '/' });
          e.preventDefault();
        },
        text: i18n.translate('xpack.lens.breadcrumbsTitle', {
          defaultMessage: 'Visualize Library',
        }),
      });
    }
    let currentDocTitle = i18n.translate('xpack.lens.breadcrumbsCreate', {
      defaultMessage: 'Create',
    });
    if (appState.persistedDoc) {
      currentDocTitle = isByValueMode
        ? i18n.translate('xpack.lens.breadcrumbsByValue', { defaultMessage: 'Edit visualization' })
        : appState.persistedDoc.title;
    }
    breadcrumbs.push({ text: currentDocTitle });
    chrome.setBreadcrumbs(breadcrumbs);
  }, [
    dashboardFeatureFlag.allowByValueEmbeddables,
    getOriginatingAppName,
    redirectToOrigin,
    getIsByValueMode,
    application,
    chrome,
    initialInput,
    appState.isLinkedToOriginatingApp,
    appState.persistedDoc,
  ]);

  const tagsIds =
    appState.persistedDoc && savedObjectsTagging
      ? savedObjectsTagging.ui.getTagIdsFromReferences(appState.persistedDoc.references)
      : [];

  const runSave: RunSave = async (saveProps, options) => {
    if (!lastKnownDoc) {
      return;
    }

    if (usageCollection) {
      usageCollection.reportUiCounter(
        incomingState?.originatingApp || 'visualize',
        METRIC_TYPE.CLICK,
        'lens:save'
      );
    }

    let references = lastKnownDoc.references;
    if (savedObjectsTagging) {
      references = savedObjectsTagging.ui.updateTagsReferences(
        references,
        saveProps.newTags || tagsIds
      );
    }

    const docToSave = {
      ...getLastKnownDocWithoutPinnedFilters(lastKnownDoc)!,
      description: saveProps.newDescription,
      title: saveProps.newTitle,
      references,
    };

    // Required to serialize filters in by value mode until
    // https://github.com/elastic/kibana/issues/77588 is fixed
    if (getIsByValueMode()) {
      docToSave.state.filters.forEach((filter) => {
        if (typeof filter.meta.value === 'function') {
          delete filter.meta.value;
        }
      });
    }

    const originalInput = saveProps.newCopyOnSave ? undefined : initialInput;
    const originalSavedObjectId = (originalInput as LensByReferenceInput)?.savedObjectId;
    if (options.saveToLibrary) {
      try {
        await checkForDuplicateTitle(
          {
            id: originalSavedObjectId,
            title: docToSave.title,
            copyOnSave: saveProps.newCopyOnSave,
            lastSavedTitle: lastKnownDoc.title,
            getEsType: () => 'lens',
            getDisplayName: () =>
              i18n.translate('xpack.lens.app.saveModalType', {
                defaultMessage: 'Lens visualization',
              }),
          },
          saveProps.isTitleDuplicateConfirmed,
          saveProps.onTitleDuplicate,
          {
            savedObjectsClient,
            overlays,
          }
        );
      } catch (e) {
        // ignore duplicate title failure, user notified in save modal
        return;
      }
    }
    try {
      const newInput = (await attributeService.wrapAttributes(
        docToSave,
        options.saveToLibrary,
        originalInput
      )) as LensEmbeddableInput;

      if (saveProps.returnToOrigin && redirectToOrigin) {
        // disabling the validation on app leave because the document has been saved.
        onAppLeave((actions) => {
          return actions.default();
        });
        redirectToOrigin({ input: newInput, isCopied: saveProps.newCopyOnSave });
        return;
      } else if (saveProps.dashboardId && redirectToDashboard) {
        // disabling the validation on app leave because the document has been saved.
        onAppLeave((actions) => {
          return actions.default();
        });
        redirectToDashboard(newInput, saveProps.dashboardId);
        return;
      }

      notifications.toasts.addSuccess(
        i18n.translate('xpack.lens.app.saveVisualization.successNotificationText', {
          defaultMessage: `Saved '{visTitle}'`,
          values: {
            visTitle: docToSave.title,
          },
        })
      );

      if (
        attributeService.inputIsRefType(newInput) &&
        newInput.savedObjectId !== originalSavedObjectId
      ) {
        chrome.recentlyAccessed.add(
          getFullPath(newInput.savedObjectId),
          docToSave.title,
          newInput.savedObjectId
        );

        dispatchSetState({ isLinkedToOriginatingApp: false });

        setIsSaveModalVisible(false);
        // remove editor state so the connection is still broken after reload
        stateTransfer.clearEditorState(APP_ID);

        redirectTo(newInput.savedObjectId);
        return;
      }

      const newDoc = {
        ...docToSave,
        ...newInput,
      };

      dispatchSetState({
        isLinkedToOriginatingApp: false,
        persistedDoc: newDoc,
        lastKnownDoc: newDoc,
      });

      setIsSaveModalVisible(false);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.dir(e);
      trackUiEvent('save_failed');
      setIsSaveModalVisible(false);
    }
  };

  const savingToLibraryPermitted = Boolean(
    appState.isSaveable && application.capabilities.visualize.save
  );

  return (
    <>
      <div className="lnsApp">
        <LensTopNavMenu
          initialInput={initialInput}
          redirectToOrigin={redirectToOrigin}
          getIsByValueMode={getIsByValueMode}
          onAppLeave={onAppLeave}
          runSave={runSave}
          setIsSaveModalVisible={setIsSaveModalVisible}
          setHeaderActionMenu={setHeaderActionMenu}
          indicateNoData={indicateNoData}
        />
        {(!appState.isAppLoading || appState.persistedDoc) && (
          <MemoizedEditorFrameWrapper
            editorFrame={editorFrame}
            onError={onError}
            showNoDataPopover={showNoDataPopover}
            initialContext={initialContext}
          />
        )}
      </div>
      <SaveModal
        isVisible={isSaveModalVisible}
        originatingApp={
          appState.isLinkedToOriginatingApp ? incomingState?.originatingApp : undefined
        }
        savingToLibraryPermitted={savingToLibraryPermitted}
        allowByValueEmbeddables={dashboardFeatureFlag.allowByValueEmbeddables}
        savedObjectsTagging={savedObjectsTagging}
        tagsIds={tagsIds}
        onSave={runSave}
        onClose={() => {
          setIsSaveModalVisible(false);
        }}
        getAppNameFromId={() => getOriginatingAppName()}
        lastKnownDoc={lastKnownDoc}
        returnToOriginSwitchLabel={
          getIsByValueMode() && initialInput
            ? i18n.translate('xpack.lens.app.updatePanel', {
                defaultMessage: 'Update panel on {originatingAppName}',
                values: { originatingAppName: getOriginatingAppName() },
              })
            : undefined
        }
      />
    </>
  );
}

const MemoizedEditorFrameWrapper = React.memo(function EditorFrameWrapper({
  editorFrame,
  onError,
  showNoDataPopover,
  initialContext,
}: {
  editorFrame: EditorFrameInstance;
  onError: (e: { message: string }) => Toast;
  showNoDataPopover: () => void;
  initialContext: VisualizeFieldContext | undefined;
}) {
  const { EditorFrameContainer } = editorFrame;
  return (
    <EditorFrameContainer
      onError={onError}
      showNoDataPopover={showNoDataPopover}
      initialContext={initialContext}
    />
  );
});

function getLastKnownDocWithoutPinnedFilters(doc?: Document) {
  if (!doc) return undefined;
  const [pinnedFilters, appFilters] = partition(
    injectFilterReferences(doc.state?.filters || [], doc.references),
    esFilters.isFilterPinned
  );
  return pinnedFilters?.length
    ? {
        ...doc,
        state: {
          ...doc.state,
          filters: appFilters,
        },
      }
    : doc;
}
