/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import { IHttpFetchError } from 'kibana/public';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { showSaveModal } from '../../../../../src/plugins/saved_objects/public';
import {
  ExploreRequest,
  GraphExploreCallback,
  GraphSearchCallback,
  GraphWorkspaceSavedObject,
  IndexPatternProvider,
  IndexPatternSavedObject,
  SearchRequest,
  Workspace,
} from '../types';
import { createGraphStore } from '../state_management';
import { createWorkspace } from '../angular/graph_client_workspace';
import { WorkspaceLayout } from './workspace_layout';
import { GraphDependencies } from '../application';
import { formatHttpError } from '../helpers/format_http_error';

export interface GraphWorkspaceProps {
  indexPatternProvider: IndexPatternProvider;
  indexPatterns: IndexPatternSavedObject[];
  savedWorkspace: GraphWorkspaceSavedObject;
  workspaceId: string;
  query: string;
  deps: GraphDependencies;
  angularLocation: angular.ILocationService;
  locationUrl: (path?: string) => string;
  reloadRoute: () => void;
}

export const GraphWorkspace = (props: GraphWorkspaceProps) => {
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
  const [loading, setLoading] = useState(false);

  const handleHttpError = useCallback(
    (error: IHttpFetchError) => {
      props.deps.toastNotifications.addDanger(formatHttpError(error));
    },
    [props.deps.toastNotifications]
  );

  const handleSearchQueryError = useCallback(
    (err: Error | string) => {
      const toastTitle = i18n.translate('xpack.graph.errorToastTitle', {
        defaultMessage: 'Graph Error',
        description: '"Graph" is a product name and should not be translated.',
      });
      if (err instanceof Error) {
        props.deps.toastNotifications.addError(err, {
          title: toastTitle,
        });
      } else {
        props.deps.toastNotifications.addDanger({
          title: toastTitle,
          text: String(err),
        });
      }
    },
    [props.deps.toastNotifications]
  );

  // Replacement function for graphClientWorkspace's comms so
  // that it works with Kibana.
  const callNodeProxy = useCallback(
    (indexName: string, query: ExploreRequest, responseHandler: GraphExploreCallback) => {
      const request = {
        body: JSON.stringify({
          index: indexName,
          query,
        }),
      };
      setLoading(true);
      return props.deps.coreStart.http
        .post('../api/graph/graphExplore', request)
        .then(function (data) {
          const response = data.resp;
          if (response.timed_out) {
            props.deps.toastNotifications.addWarning(
              i18n.translate('xpack.graph.exploreGraph.timedOutWarningText', {
                defaultMessage: 'Exploration timed out',
              })
            );
          }
          responseHandler(response);
        })
        .catch(handleHttpError)
        .finally(() => setLoading(false));
    },
    [props.deps.coreStart.http, props.deps.toastNotifications, handleHttpError]
  );

  // Helper function for the graphClientWorkspace to perform a query
  const callSearchNodeProxy = useCallback(
    (indexName: string, query: SearchRequest, responseHandler: GraphSearchCallback) => {
      const request = {
        body: JSON.stringify({
          index: indexName,
          body: query,
        }),
      };
      setLoading(true);
      props.deps.coreStart.http
        .post('../api/graph/searchProxy', request)
        .then(function (data) {
          const response = data.resp;
          responseHandler(response);
        })
        .catch(handleHttpError)
        .finally(() => setLoading(false));
    },
    [props.deps.coreStart.http, handleHttpError]
  );

  const [store] = useState(() =>
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
            // console.log(newNodes);
          },
          changeHandler: () => setRenderCounter((cur) => ++cur),
          graphExploreProxy: callNodeProxy,
          searchProxy: callSearchNodeProxy,
          exploreControls,
        };
        const createdWorkspace = createWorkspace(options);
        workspaceRef.current = createdWorkspace;
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
      changeUrl: (newUrl) => props.locationUrl(newUrl),
      notifyReact: () => setRenderCounter((cur) => ++cur),
      chrome: props.deps.chrome,
      I18nContext: props.deps.coreStart.i18n.Context,
      handleSearchQueryError,
    })
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
          <WorkspaceLayout
            renderCounter={renderCounter}
            workspace={workspaceRef.current}
            loading={loading}
            setHeaderActionMenu={props.deps.setHeaderActionMenu}
            graphSavePolicy={props.deps.graphSavePolicy}
            navigation={props.deps.navigation}
            capabilities={props.deps.capabilities}
            coreStart={props.deps.coreStart}
            canEditDrillDownUrls={props.deps.canEditDrillDownUrls}
            overlays={props.deps.overlays}
            locationUrl={props.locationUrl}
            reloadRoute={props.reloadRoute}
            urlQuery={props.query}
            indexPatterns={props.indexPatterns}
            savedWorkspace={props.savedWorkspace}
            indexPatternProvider={props.indexPatternProvider}
          />
        </Provider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};
