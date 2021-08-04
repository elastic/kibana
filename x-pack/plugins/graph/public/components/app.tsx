/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useRef, useState } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { Provider } from 'react-redux';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { showSaveModal } from '../../../../../src/plugins/saved_objects/public';
import {
  GraphWorkspaceSavedObject,
  IndexPatternProvider,
  IndexPatternSavedObject,
  Workspace,
} from '../types';
import { createGraphStore, GraphStore } from '../state_management';
import { createWorkspace } from '../angular/graph_client_workspace';
import { GraphWorkspace } from './graph_workspace';
import { GraphDependencies } from '../application';
import { useNodeProxy } from './graph_workspace/use_node_proxy';

export interface GraphWorkspaceProps {
  indexPatternProvider: IndexPatternProvider;
  indexPatterns: IndexPatternSavedObject[];
  savedWorkspace: GraphWorkspaceSavedObject;
  workspaceId: string;
  query: string;
  deps: GraphDependencies;
  location: angular.ILocationService;
}

const GraphWorkspaceMemoized = memo(GraphWorkspace);

export const GraphApp = (props: GraphWorkspaceProps) => {
  /**
   * It's temporary workaround, which should be removed
   * after migration Workspace to redux.
   * `workspaceRef` holds mutable workspace object
   */
  const workspaceRef = useRef<Workspace>();
  const workspace = workspaceRef.current;
  /**
   * counter only needs to force react state update on workspace changes
   */
  const [renderCounter, setRenderCounter] = useState(0);

  const { loading, callNodeProxy, callSearchNodeProxy } = useNodeProxy({
    coreStart: props.deps.coreStart,
    toastNotifications: props.deps.toastNotifications,
  });
  const store = useMemo<GraphStore>(
    () =>
      createGraphStore({
        basePath: props.deps.getBasePath(),
        addBasePath: props.deps.addBasePath,
        indexPatternProvider: props.indexPatternProvider,
        indexPatterns: props.indexPatterns,
        createWorkspace: (indexPattern, exploreControls) => {
          const options = {
            indexName: indexPattern,
            vertex_fields: [],
            // Here we have the opportunity to look up labels for nodes...
            nodeLabeller() {
              //   console.log(newNodes);
            },
            changeHandler() {
              setRenderCounter((cur) => ++cur);
            },
            graphExploreProxy: callNodeProxy,
            searchProxy: callSearchNodeProxy,
            exploreControls,
          };
          const createdWorkspace = createWorkspace(options);
          workspaceRef.current = createdWorkspace;
          // setWorkspaceWrapper({ workspace: createdWorkspace });
          return createdWorkspace;
        },
        getWorkspace: () => workspaceRef.current,
        getSavedWorkspace: () => props.savedWorkspace,
        notifications: props.deps.coreStart.notifications,
        http: props.deps.coreStart.http,
        overlays: props.deps.coreStart.overlays,
        savedObjectsClient: props.deps.savedObjectsClient,
        showSaveModal,
        savePolicy: props.deps.graphSavePolicy,
        changeUrl: (newUrl) => {
          props.location.url(newUrl);
        },
        notifyAngular: () => {
          setRenderCounter((cur) => ++cur);
        },
        chrome: props.deps.chrome,
        I18nContext: props.deps.coreStart.i18n.Context,
      }),
    [
      callNodeProxy,
      callSearchNodeProxy,
      props.deps,
      props.indexPatternProvider,
      props.indexPatterns,
      props.savedWorkspace,
      props.location,
    ]
  );

  const services = useMemo(
    () => ({
      appName: 'graph',
      storage: props.deps.storage,
      data: props.deps.data,
      ...props.deps.coreStart,
    }),
    [props.deps.coreStart, props.deps.data, props.deps.storage]
  );

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <Provider store={store}>
          <GraphWorkspaceMemoized
            counter={renderCounter}
            setHeaderActionMenu={props.deps.setHeaderActionMenu}
            graphSavePolicy={props.deps.graphSavePolicy}
            navigation={props.deps.navigation}
            capabilities={props.deps.capabilities}
            coreStart={props.deps.coreStart}
            canEditDrillDownUrls={props.deps.canEditDrillDownUrls}
            toastNotifications={props.deps.toastNotifications}
            overlays={props.deps.overlays}
            location={props.location}
            query={props.query}
            indexPatterns={props.indexPatterns}
            savedWorkspace={props.savedWorkspace}
            indexPatternProvider={props.indexPatternProvider}
            loading={loading}
            workspace={workspace}
          />
        </Provider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};
