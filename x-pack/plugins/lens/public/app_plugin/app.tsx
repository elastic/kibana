/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './app.scss';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBreadcrumb } from '@elastic/eui';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../../../../src/plugins/kibana_utils/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { OnSaveProps } from '../../../../../src/plugins/saved_objects/public';
import { syncQueryStateWithUrl } from '../../../../../src/plugins/data/public';
import { LensAppProps, LensAppServices } from './types';
import { LensTopNavMenu } from './lens_top_nav';
import { LensByReferenceInput } from '../embeddable';
import { EditorFrameInstance } from '../types';
import { Document } from '../persistence/saved_object_store';

import {
  setState,
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
  topNavMenuEntryGenerators,
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
      extractFilterReferences: data.query.filterManager.extract,
    }),
    [datasourceMap, visualizationMap, data.query.filterManager.extract]
  );

  const currentDoc = useLensSelector((state) =>
    selectSavedObjectFormat(state, selectorDependencies)
  );

  // Used to show a popover that guides the user towards changing the date range when no data is available.
  const [indicateNoData, setIndicateNoData] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [lastKnownDoc, setLastKnownDoc] = useState<Document | undefined>(undefined);

  useEffect(() => {
    if (currentDoc) {
      setLastKnownDoc(currentDoc);
    }
  }, [currentDoc]);

  const showNoDataPopover = useCallback(() => {
    setIndicateNoData(true);
  }, [setIndicateNoData]);

  useEffect(() => {
    if (indicateNoData) {
      setIndicateNoData(false);
    }
  }, [setIndicateNoData, indicateNoData, searchSessionId]);

  const getIsByValueMode = useCallback(
    () =>
      Boolean(
        // Temporarily required until the 'by value' paradigm is default.
        dashboardFeatureFlag.allowByValueEmbeddables &&
          isLinkedToOriginatingApp &&
          !(initialInput as LensByReferenceInput)?.savedObjectId
      ),
    [dashboardFeatureFlag.allowByValueEmbeddables, isLinkedToOriginatingApp, initialInput]
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
        !isLensEqual(persistedDoc, lastKnownDoc, data.query.filterManager.inject, datasourceMap) &&
        (isSaveable || persistedDoc)
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
    isSaveable,
    persistedDoc,
    application.capabilities.visualize.save,
    data.query.filterManager.inject,
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
    const breadcrumbs: EuiBreadcrumb[] = [];
    if (isLinkedToOriginatingApp && getOriginatingAppName() && redirectToOrigin) {
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
  ]);

  const runSave = useCallback(
    (saveProps: SaveProps, options: { saveToLibrary: boolean }) => {
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
      setIsSaveModalVisible,
    ]
  );

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
          topNavMenuEntryGenerators={topNavMenuEntryGenerators}
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
