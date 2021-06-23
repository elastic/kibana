/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './app.scss';

import { isEqual } from 'lodash';
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
import { OnSaveProps } from '../../../../../src/plugins/saved_objects/public';
import { syncQueryStateWithUrl } from '../../../../../src/plugins/data/public';
import { LensAppProps, LensAppServices } from './types';
import { LensTopNavMenu } from './lens_top_nav';
import { LensByReferenceInput } from '../editor_frame_service/embeddable';
import { EditorFrameInstance } from '../types';
import { Document } from '../persistence/saved_object_store';
import {
  setState as setAppState,
  useLensSelector,
  useLensDispatch,
  LensAppState,
  DispatchSetState,
} from '../state_management';
import {
  SaveModalContainer,
  getLastKnownDocWithoutPinnedFilters,
  runSaveLensVisualization,
} from './save_modal_container';
import { getSavedObjectFormat } from '../editor_frame_service/editor_frame/save';

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
  initialContext,
  datasourceMap,
  visualizationMap,
}: LensAppProps) {
  const lensAppServices = useKibana<LensAppServices>().services;

  const {
    data,
    chrome,
    uiSettings,
    application,
    notifications,
    savedObjectsTagging,
    getOriginatingAppName,

    // Temporarily required until the 'by value' paradigm is default.
    dashboardFeatureFlag,
  } = lensAppServices;

  const dispatch = useLensDispatch();
  const dispatchSetState: DispatchSetState = useCallback(
    (state: Partial<LensAppState>) => dispatch(setAppState(state)),
    [dispatch]
  );

  const appState = useLensSelector((state) => state.app);
  const {
    datasourceStates,
    visualization,
    filters,
    query,
    title,
    description,
    persistedId,
    activeDatasourceId,
  } = appState;

  // Used to show a popover that guides the user towards changing the date range when no data is available.
  const [indicateNoData, setIndicateNoData] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [lastKnownDoc, setLastKnownDoc] = useState<Document | undefined>(undefined);

  useEffect(() => {
    const activeVisualization = visualization.activeId && visualizationMap[visualization.activeId];
    const activeDatasource =
      activeDatasourceId && !datasourceStates[activeDatasourceId].isLoading
        ? datasourceMap[activeDatasourceId]
        : undefined;

    if (!activeDatasource || !activeVisualization || !visualization.state) {
      return;
    }
    setLastKnownDoc(
      getSavedObjectFormat({
        activeDatasources: Object.keys(datasourceStates).reduce(
          (acc, datasourceId) => ({
            ...acc,
            [datasourceId]: datasourceMap[datasourceId],
          }),
          {}
        ),
        datasourceStates,
        visualization,
        filters,
        query,
        title,
        description,
        persistedId,
      })
    );
  }, [
    datasourceStates,
    visualization,
    filters,
    query,
    title,
    description,
    persistedId,
    activeDatasourceId,
    datasourceMap,
    visualizationMap,
  ]);

  const showNoDataPopover = useCallback(() => {
    setIndicateNoData(true);
  }, [setIndicateNoData]);

  useEffect(() => {
    if (indicateNoData) {
      setIndicateNoData(false);
    }
  }, [setIndicateNoData, indicateNoData, appState.searchSessionId]);

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
    appState.isLinkedToOriginatingApp,
    appState.persistedDoc,
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
          persistedDoc: appState.persistedDoc,
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
      incomingState?.originatingApp
      lastKnownDoc,
      appState.persistedDoc,
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
          title={lastKnownDoc?.title}
        />
        {(!appState.isAppLoading || appState.persistedDoc) && (
          <MemoizedEditorFrameWrapper
            editorFrame={editorFrame}
            showNoDataPopover={showNoDataPopover}
            initialContext={initialContext}
          />
        )}
      </div>
      {isSaveModalVisible && (
        <SaveModalContainer
          lensServices={lensAppServices}
          originatingApp={
            appState.isLinkedToOriginatingApp ? incomingState?.originatingApp : undefined
          }
          isSaveable={appState.isSaveable}
          runSave={runSave}
          onClose={() => {
            setIsSaveModalVisible(false);
          }}
          getAppNameFromId={() => getOriginatingAppName()}
          lastKnownDoc={lastKnownDoc}
          onAppLeave={onAppLeave}
          persistedDoc={appState.persistedDoc}
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
  initialContext,
}: {
  editorFrame: EditorFrameInstance;
  showNoDataPopover: () => void;
  initialContext: VisualizeFieldContext | undefined;
}) {
  const { EditorFrameContainer } = editorFrame;
  return (
    <EditorFrameContainer showNoDataPopover={showNoDataPopover} initialContext={initialContext} />
  );
});
