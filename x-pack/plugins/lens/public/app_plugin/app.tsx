/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './app.scss';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBreadcrumb, EuiConfirmModal } from '@elastic/eui';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { useExecutionContext, useKibana } from '@kbn/kibana-react-plugin/public';
import { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { syncQueryStateWithUrl } from '@kbn/data-plugin/public';
import { LensAppProps, LensAppServices } from './types';
import { LensTopNavMenu } from './lens_top_nav';
import { LensByReferenceInput } from '../embeddable';
import { EditorFrameInstance } from '../types';
import { Document } from '../persistence/saved_object_store';

import {
  setState,
  applyChanges,
  useLensSelector,
  useLensDispatch,
  LensAppState,
  DispatchSetState,
  selectSavedObjectFormat,
} from '../state_management';
import { SaveModalContainer, runSaveLensVisualization } from './save_modal_container';
import { LensInspector } from '../lens_inspector_service';
import { getEditPath } from '../../common';
import { isLensEqual } from './lens_document_equality';

export type SaveProps = Omit<OnSaveProps, 'onTitleDuplicate' | 'newDescription'> & {
  returnToOrigin: boolean;
  dashboardId?: string | null;
  onTitleDuplicate?: OnSaveProps['onTitleDuplicate'];
  newDescription?: string;
  newTags?: string[];
};

export function App({
  history,
  onAppLeave,
  redirectTo,
  editorFrame,
  initialInput,
  incomingState,
  redirectToOrigin,
  setHeaderActionMenu,
  datasourceMap,
  visualizationMap,
  contextOriginatingApp,
  topNavMenuEntryGenerators,
  initialContext,
  theme$,
}: LensAppProps) {
  const lensAppServices = useKibana<LensAppServices>().services;

  const {
    data,
    chrome,
    uiSettings,
    inspector: lensInspector,
    application,
    notifications,
    savedObjectsTagging,
    getOriginatingAppName,
    spaces,
    http,
    executionContext,
    // Temporarily required until the 'by value' paradigm is default.
    dashboardFeatureFlag,
  } = lensAppServices;

  const dispatch = useLensDispatch();
  const dispatchSetState: DispatchSetState = useCallback(
    (state: Partial<LensAppState>) => dispatch(setState(state)),
    [dispatch]
  );

  const {
    persistedDoc,
    sharingSavedObjectProps,
    isLinkedToOriginatingApp,
    searchSessionId,
    isLoading,
    isSaveable,
  } = useLensSelector((state) => state.lens);

  const selectorDependencies = useMemo(
    () => ({
      datasourceMap,
      visualizationMap,
      extractFilterReferences: data.query.filterManager.extract.bind(data.query.filterManager),
    }),
    [datasourceMap, visualizationMap, data.query.filterManager]
  );

  const currentDoc = useLensSelector((state) =>
    selectSavedObjectFormat(state, selectorDependencies)
  );

  // Used to show a popover that guides the user towards changing the date range when no data is available.
  const [indicateNoData, setIndicateNoData] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [lastKnownDoc, setLastKnownDoc] = useState<Document | undefined>(undefined);
  const [initialDocFromContext, setInitialDocFromContext] = useState<Document | undefined>(
    undefined
  );
  const [isGoBackToVizEditorModalVisible, setIsGoBackToVizEditorModalVisible] = useState(false);
  const savedObjectId = (initialInput as LensByReferenceInput)?.savedObjectId;

  useEffect(() => {
    if (currentDoc) {
      setLastKnownDoc(currentDoc);
    }
  }, [currentDoc]);

  const showNoDataPopover = useCallback(() => {
    setIndicateNoData(true);
  }, [setIndicateNoData]);

  useExecutionContext(executionContext, {
    type: 'application',
    id: savedObjectId || 'new',
    page: 'editor',
  });

  useEffect(() => {
    if (indicateNoData) {
      setIndicateNoData(false);
    }
  }, [setIndicateNoData, indicateNoData, searchSessionId]);

  const getIsByValueMode = useCallback(
    () =>
      Boolean(
        // Temporarily required until the 'by value' paradigm is default.
        dashboardFeatureFlag.allowByValueEmbeddables && isLinkedToOriginatingApp && !savedObjectId
      ),
    [dashboardFeatureFlag.allowByValueEmbeddables, isLinkedToOriginatingApp, savedObjectId]
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
      if (
        application.capabilities.visualize.save &&
        !isLensEqual(
          persistedDoc,
          lastKnownDoc,
          data.query.filterManager.inject.bind(data.query.filterManager),
          datasourceMap
        ) &&
        (isSaveable || persistedDoc)
      ) {
        return actions.confirm(
          i18n.translate('xpack.lens.app.unsavedWorkMessage', {
            defaultMessage: 'Leave Lens with unsaved work?',
          }),
          i18n.translate('xpack.lens.app.unsavedWorkTitle', {
            defaultMessage: 'Unsaved changes',
          }),
          undefined,
          i18n.translate('xpack.lens.app.unsavedWorkConfirmBtn', {
            defaultMessage: 'Discard changes',
          }),
          'danger'
        );
      } else {
        return actions.default();
      }
    });
  }, [
    onAppLeave,
    lastKnownDoc,
    isSaveable,
    persistedDoc,
    application.capabilities.visualize.save,
    data.query.filterManager,
    datasourceMap,
  ]);

  const getLegacyUrlConflictCallout = useCallback(() => {
    // This function returns a callout component *if* we have encountered a "legacy URL conflict" scenario
    if (spaces && sharingSavedObjectProps?.outcome === 'conflict' && persistedDoc?.savedObjectId) {
      // We have resolved to one object, but another object has a legacy URL alias associated with this ID/page. We should display a
      // callout with a warning for the user, and provide a way for them to navigate to the other object.
      const currentObjectId = persistedDoc.savedObjectId;
      const otherObjectId = sharingSavedObjectProps?.aliasTargetId!; // This is always defined if outcome === 'conflict'
      const otherObjectPath = http.basePath.prepend(
        `${getEditPath(otherObjectId)}${history.location.search}`
      );
      return spaces.ui.components.getLegacyUrlConflict({
        objectNoun: i18n.translate('xpack.lens.appName', {
          defaultMessage: 'Lens visualization',
        }),
        currentObjectId,
        otherObjectId,
        otherObjectPath,
      });
    }
    return null;
  }, [persistedDoc, sharingSavedObjectProps, spaces, http, history]);

  // Sync Kibana breadcrumbs any time the saved document's title changes
  useEffect(() => {
    const isByValueMode = getIsByValueMode();
    const comesFromVizEditorDashboard =
      initialContext && 'originatingApp' in initialContext && initialContext.originatingApp;
    const breadcrumbs: EuiBreadcrumb[] = [];
    if (
      (isLinkedToOriginatingApp || comesFromVizEditorDashboard) &&
      getOriginatingAppName() &&
      redirectToOrigin
    ) {
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
    if (persistedDoc) {
      currentDocTitle = isByValueMode
        ? i18n.translate('xpack.lens.breadcrumbsByValue', { defaultMessage: 'Edit visualization' })
        : persistedDoc.title;
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
    isLinkedToOriginatingApp,
    persistedDoc,
    initialContext,
  ]);

  const runSave = useCallback(
    (saveProps: SaveProps, options: { saveToLibrary: boolean }) => {
      dispatch(applyChanges());
      return runSaveLensVisualization(
        {
          lastKnownDoc,
          getIsByValueMode,
          savedObjectsTagging,
          initialInput,
          redirectToOrigin,
          persistedDoc,
          onAppLeave,
          redirectTo,
          originatingApp: incomingState?.originatingApp,
          ...lensAppServices,
        },
        saveProps,
        options
      ).then(
        (newState) => {
          if (newState) {
            dispatchSetState(newState);
            setIsSaveModalVisible(false);
          }
        },
        () => {
          // error is handled inside the modal
          // so ignoring it here
        }
      );
    },
    [
      incomingState?.originatingApp,
      lastKnownDoc,
      persistedDoc,
      getIsByValueMode,
      savedObjectsTagging,
      initialInput,
      redirectToOrigin,
      onAppLeave,
      redirectTo,
      lensAppServices,
      dispatchSetState,
      dispatch,
      setIsSaveModalVisible,
    ]
  );

  // keeping the initial doc state created by the context
  useEffect(() => {
    if (lastKnownDoc && !initialDocFromContext) {
      setInitialDocFromContext(lastKnownDoc);
    }
  }, [lastKnownDoc, initialDocFromContext]);

  // if users comes to Lens from the Viz editor, they should have the option to navigate back
  const goBackToOriginatingApp = useCallback(() => {
    if (
      initialContext &&
      'vizEditorOriginatingAppUrl' in initialContext &&
      initialContext.vizEditorOriginatingAppUrl
    ) {
      const initialDocFromContextHasChanged = !isLensEqual(
        initialDocFromContext,
        lastKnownDoc,
        data.query.filterManager.inject,
        datasourceMap
      );
      if (!initialDocFromContextHasChanged) {
        onAppLeave((actions) => {
          return actions.default();
        });
        application.navigateToApp('visualize', { path: initialContext.vizEditorOriginatingAppUrl });
      } else {
        setIsGoBackToVizEditorModalVisible(true);
      }
    }
  }, [
    application,
    data.query.filterManager.inject,
    datasourceMap,
    initialContext,
    initialDocFromContext,
    lastKnownDoc,
    onAppLeave,
  ]);

  const navigateToVizEditor = useCallback(() => {
    setIsGoBackToVizEditorModalVisible(false);
    if (
      initialContext &&
      'vizEditorOriginatingAppUrl' in initialContext &&
      initialContext.vizEditorOriginatingAppUrl
    ) {
      onAppLeave((actions) => {
        return actions.default();
      });
      application.navigateToApp('visualize', { path: initialContext.vizEditorOriginatingAppUrl });
    }
  }, [application, initialContext, onAppLeave]);

  const initialContextIsEmbedded = useMemo(() => {
    return Boolean(
      initialContext && 'originatingApp' in initialContext && initialContext.originatingApp
    );
  }, [initialContext]);

  return (
    <>
      <div className="lnsApp" data-test-subj="lnsApp">
        <LensTopNavMenu
          initialInput={initialInput}
          redirectToOrigin={redirectToOrigin}
          getIsByValueMode={getIsByValueMode}
          onAppLeave={onAppLeave}
          runSave={runSave}
          setIsSaveModalVisible={setIsSaveModalVisible}
          setHeaderActionMenu={setHeaderActionMenu}
          indicateNoData={indicateNoData}
          datasourceMap={datasourceMap}
          title={persistedDoc?.title}
          lensInspector={lensInspector}
          goBackToOriginatingApp={goBackToOriginatingApp}
          contextOriginatingApp={contextOriginatingApp}
          initialContextIsEmbedded={initialContextIsEmbedded}
          topNavMenuEntryGenerators={topNavMenuEntryGenerators}
          initialContext={initialContext}
          theme$={theme$}
        />
        {getLegacyUrlConflictCallout()}
        {(!isLoading || persistedDoc) && (
          <MemoizedEditorFrameWrapper
            editorFrame={editorFrame}
            showNoDataPopover={showNoDataPopover}
            lensInspector={lensInspector}
          />
        )}
      </div>
      {isSaveModalVisible && (
        <SaveModalContainer
          lensServices={lensAppServices}
          originatingApp={isLinkedToOriginatingApp ? incomingState?.originatingApp : undefined}
          isSaveable={isSaveable}
          runSave={runSave}
          onClose={() => {
            setIsSaveModalVisible(false);
          }}
          getAppNameFromId={() => getOriginatingAppName()}
          lastKnownDoc={lastKnownDoc}
          onAppLeave={onAppLeave}
          persistedDoc={persistedDoc}
          initialInput={initialInput}
          redirectTo={redirectTo}
          redirectToOrigin={redirectToOrigin}
          returnToOriginSwitchLabel={
            getIsByValueMode() && initialInput
              ? i18n.translate('xpack.lens.app.updatePanel', {
                  defaultMessage: 'Update panel on {originatingAppName}',
                  values: { originatingAppName: getOriginatingAppName() },
                })
              : undefined
          }
        />
      )}
      {isGoBackToVizEditorModalVisible && (
        <EuiConfirmModal
          maxWidth={600}
          title={i18n.translate('xpack.lens.app.goBackModalTitle', {
            defaultMessage: 'Discard changes?',
          })}
          onCancel={() => setIsGoBackToVizEditorModalVisible(false)}
          onConfirm={navigateToVizEditor}
          cancelButtonText={i18n.translate('xpack.lens.app.goBackModalCancelBtn', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.lens.app.goBackModalTitle', {
            defaultMessage: 'Discard changes?',
          })}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          {i18n.translate('xpack.lens.app.goBackModalMessage', {
            defaultMessage:
              'The changes you have made here are not backwards compatible with your original {contextOriginatingApp} visualization. Are you sure you want to discard these unsaved changes and return to {contextOriginatingApp}?',
            values: { contextOriginatingApp },
          })}
        </EuiConfirmModal>
      )}
    </>
  );
}

const MemoizedEditorFrameWrapper = React.memo(function EditorFrameWrapper({
  editorFrame,
  showNoDataPopover,
  lensInspector,
}: {
  editorFrame: EditorFrameInstance;
  lensInspector: LensInspector;
  showNoDataPopover: () => void;
}) {
  const { EditorFrameContainer } = editorFrame;
  return (
    <EditorFrameContainer showNoDataPopover={showNoDataPopover} lensInspector={lensInspector} />
  );
});
