/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Provider } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Workspace } from '../types';
import { createGraphStore } from '../state_management';
import { createWorkspace } from '../services/workspace/graph_client_workspace';
import { WorkspaceLayout } from '../components/workspace_layout';
import { GraphServices } from '../application';
import { useWorkspaceLoader } from '../helpers/use_workspace_loader';
import { useGraphLoader } from '../helpers/use_graph_loader';
import { createCachedIndexPatternProvider } from '../services/index_pattern_cache';

export interface WorkspaceRouteProps {
  deps: GraphServices;
}

export const WorkspaceRoute = ({
  deps: {
    toastNotifications,
    coreStart,
    savedObjectsClient,
    graphSavePolicy,
    chrome,
    canEditDrillDownUrls,
    overlays,
    navigation,
    capabilities,
    storage,
    data,
    unifiedSearch,
    getBasePath,
    addBasePath,
    setHeaderActionMenu,
    spaces,
    indexPatterns: getIndexPatternProvider,
    inspect,
  },
}: WorkspaceRouteProps) => {
  /**
   * It's temporary workaround, which should be removed after migration `workspace` to redux.
   * Ref holds mutable `workspace` object. After each `workspace.methodName(...)` call
   * (which might mutate `workspace` somehow), react state needs to be updated using
   * `workspace.changeHandler()`.
   */
  const workspaceRef = useRef<Workspace>();
  /**
   * Providing `workspaceRef.current` to the hook dependencies or components itself
   * will not leads to updates, therefore `renderCounter` is used to update react state.
   */
  const [renderCounter, setRenderCounter] = useState(0);
  const history = useHistory();

  const indexPatternProvider = useMemo(
    () => createCachedIndexPatternProvider(getIndexPatternProvider.get),
    [getIndexPatternProvider.get]
  );

  const services = useMemo(
    () => ({
      appName: 'graph',
      storage,
      data,
      unifiedSearch,
      ...coreStart,
    }),
    [coreStart, data, storage, unifiedSearch]
  );

  const { loading, requestAdapter, callNodeProxy, callSearchNodeProxy, handleSearchQueryError } =
    useGraphLoader({
      toastNotifications,
      coreStart,
    });

  const [store] = useState(() =>
    createGraphStore({
      basePath: getBasePath(),
      addBasePath,
      indexPatternProvider,
      createWorkspace: (indexPattern, exploreControls) => {
        const options = {
          indexName: indexPattern,
          vertex_fields: [],
          // Here we have the opportunity to look up labels for nodes...
          nodeLabeller() {
            // console.log(newNodes);
          },
          changeHandler: () => setRenderCounter((cur) => cur + 1),
          graphExploreProxy: callNodeProxy,
          searchProxy: callSearchNodeProxy,
          exploreControls,
        };
        const createdWorkspace = (workspaceRef.current = createWorkspace(options));
        return createdWorkspace;
      },
      getWorkspace: () => workspaceRef.current,
      notifications: coreStart.notifications,
      http: coreStart.http,
      overlays: coreStart.overlays,
      savedObjectsClient,
      savePolicy: graphSavePolicy,
      changeUrl: (newUrl) => history.push(newUrl),
      notifyReact: () => setRenderCounter((cur) => cur + 1),
      chrome,
      handleSearchQueryError,
    })
  );

  const loaded = useWorkspaceLoader({
    workspaceRef,
    store,
    savedObjectsClient,
    spaces,
    coreStart,
    data,
  });

  if (!loaded) {
    return null;
  }

  const { savedWorkspace, sharingSavedObjectProps } = loaded;

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <Provider store={store}>
          <WorkspaceLayout
            spaces={spaces}
            sharingSavedObjectProps={sharingSavedObjectProps}
            renderCounter={renderCounter}
            workspace={workspaceRef.current}
            loading={loading}
            setHeaderActionMenu={setHeaderActionMenu}
            graphSavePolicy={graphSavePolicy}
            navigation={navigation}
            capabilities={capabilities}
            coreStart={coreStart}
            canEditDrillDownUrls={canEditDrillDownUrls}
            overlays={overlays}
            savedWorkspace={savedWorkspace}
            indexPatternProvider={indexPatternProvider}
            inspect={inspect}
            requestAdapter={requestAdapter}
          />
        </Provider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};
