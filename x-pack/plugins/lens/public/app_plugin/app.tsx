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
} from '../state_management';
import {
  SaveModalContainer,
  getLastKnownDocWithoutPinnedFilters,
  runSaveLensVisualization,
} from './save_modal_container';
import { getSavedObjectFormat } from '../utils';

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
    (state: Partial<LensAppState>) => dispatch(setState(state)),
    [dispatch]
  );

  const {
    datasourceStates,
    visualization,
    filters,
    query,
    activeDatasourceId,
    persistedDoc,
    isLinkedToOriginatingApp,
    searchSessionId,
    isLoading,
    isSaveable,
  } = useLensSelector((state) => state.lens);

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
      // todo: that should be redux store selector
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
        title: persistedDoc?.title || '',
        description: persistedDoc?.description,
        persistedId: persistedDoc?.savedObjectId,
      })
    );
  }, [
    persistedDoc?.title,
    persistedDoc?.description,
    persistedDoc?.savedObjectId,
    datasourceStates,
    visualization,
    filters,
    query,
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
      // Confirm when the user has made any changes to an existing doc
      // or when the user has configured something without saving

      if (
        application.capabilities.visualize.save &&
        !isEqual(persistedDoc?.state, getLastKnownDocWithoutPinnedFilters(lastKnownDoc)?.state) &&
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
  }, [onAppLeave, lastKnownDoc, isSaveable, persistedDoc, application.capabilities.visualize.save]);

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
        />
        {(!isLoading || persistedDoc) && (
          <MemoizedEditorFrameWrapper
            editorFrame={editorFrame}
            showNoDataPopover={showNoDataPopover}
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
}: {
  editorFrame: EditorFrameInstance;
  showNoDataPopover: () => void;
}) {
  const { EditorFrameContainer } = editorFrame;
  return <EditorFrameContainer showNoDataPopover={showNoDataPopover} />;
});
