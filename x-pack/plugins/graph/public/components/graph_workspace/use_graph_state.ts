/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { showSaveModal } from '../../../../../../src/plugins/saved_objects/public';
import {
  GraphWorkspaceSavedObject,
  IndexPatternProvider,
  IndexPatternSavedObject,
  UrlTemplate,
  Workspace,
  WorkspaceField,
} from '../../types';
import { GraphDependencies } from '../../application';
import { createGraphStore, GraphStore, hasFieldsSelector } from '../../state_management';
import { createWorkspace } from '../../angular/graph_client_workspace';
import { useNodeProxy } from './use_node_proxy';

interface UseGraphStateProps {
  indexPatternProvider: IndexPatternProvider;
  indexPatterns: IndexPatternSavedObject[];
  savedWorkspace: GraphWorkspaceSavedObject;
  workspaceId: string;
  query: string;
  deps: GraphDependencies;
  location: angular.ILocationService;
}

export const useGraphState = (props: UseGraphStateProps) => {
  const [liveResponseFields, setLiveResponseFields] = useState<WorkspaceField[]>();
  const { loading, callNodeProxy, callSearchNodeProxy } = useNodeProxy({
    coreStart: props.deps.coreStart,
    toastNotifications: props.deps.toastNotifications,
  });
  const [urlTemplates, setUrlTemplates] = useState<UrlTemplate[]>();
  const [workspaceInitialized, setWorkspaceInitialized] = useState<boolean>();
  const [noIndexPatterns, setNoIndexPatterns] = useState<boolean>(false);
  const [initialQuery, setInitialQuery] = useState<string>();

  /**
   * It's temporary workaround, which should be removed
   * after migration Workspace to redux.
   * workspaceRef only needs to provide getWorkspace callback for redux-saga properly
   * workspaceWrapper needs to update workspace object reference in a in a hacky way,
   * since:
   *  - `setWorkspace(workspace)` will not update react state
   *  - In case of `setWorkspace((cur) => { ...cur })`,
   *    workspace.selectedNodes lost on update
   */
  const workspaceRef = useRef<Workspace>();
  const [workspaceWrapper, setWorkspaceWrapper] = useState<{ workspace: Workspace }>();
  const workspace = workspaceWrapper?.workspace;

  const updateWorkspace = useCallback(() => {
    setWorkspaceWrapper((cur) => ({ workspace: cur!.workspace! }));
  }, []);

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
              updateWorkspace();
            },
            graphExploreProxy: callNodeProxy,
            searchProxy: callSearchNodeProxy,
            exploreControls,
          };
          const createdWorkspace = createWorkspace(options);
          workspaceRef.current = createdWorkspace;
          setWorkspaceWrapper({ workspace: createdWorkspace });
          return createdWorkspace;
        },
        setLiveResponseFields: (fields) => setLiveResponseFields(fields),
        setUrlTemplates: (newUrlTemplates) => setUrlTemplates(newUrlTemplates),
        getWorkspace: () => workspaceRef.current,
        getSavedWorkspace: () => props.savedWorkspace,
        notifications: props.deps.coreStart.notifications,
        http: props.deps.coreStart.http,
        overlays: props.deps.coreStart.overlays,
        savedObjectsClient: props.deps.savedObjectsClient,
        showSaveModal,
        setWorkspaceInitialized: () => setWorkspaceInitialized(true),
        savePolicy: props.deps.graphSavePolicy,
        changeUrl: (newUrl) => {
          // $scope.$evalAsync(() => {
          //   $location.url(newUrl);
          // });
        },
        notifyAngular: () => {
          updateWorkspace();
        },
        chrome: props.deps.chrome,
        I18nContext: props.deps.coreStart.i18n.Context,
      }),
    []
  );

  // Deal with situation of request to open saved workspace
  useEffect(() => {
    if (props.savedWorkspace.id) {
      store.dispatch({
        type: 'x-pack/graph/LOAD_WORKSPACE',
        payload: props.savedWorkspace,
      });
    } else {
      setNoIndexPatterns(props.indexPatterns.length === 0);
    }
  }, [props.indexPatterns.length, props.savedWorkspace, store]);

  const handleError = useCallback(
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

  const submit = useCallback(
    (searchTerm: string) => {
      setWorkspaceInitialized(true);
      // type casting is safe, at this point workspace should be loaded
      const numHops = 2;
      const curWorkspace = workspace as Workspace;
      if (searchTerm.startsWith('{')) {
        try {
          const query = JSON.parse(searchTerm);
          if (query.vertices) {
            // Is a graph explore request
            curWorkspace.callElasticsearch(query);
          } else {
            // Is a regular query DSL query
            curWorkspace.search(query, liveResponseFields, numHops);
          }
        } catch (err) {
          handleError(err);
        }
        return;
      }
      curWorkspace.simpleSearch(searchTerm, liveResponseFields, numHops);
    },
    [handleError, liveResponseFields, workspace]
  );

  const canWipeWorkspace = useCallback(
    (callback, text, options) => {
      if (!hasFieldsSelector(store.getState())) {
        callback();
        return;
      }
      const confirmModalOptions = {
        confirmButtonText: i18n.translate('xpack.graph.leaveWorkspace.confirmButtonLabel', {
          defaultMessage: 'Leave anyway',
        }),
        title: i18n.translate('xpack.graph.leaveWorkspace.modalTitle', {
          defaultMessage: 'Unsaved changes',
        }),
        'data-test-subj': 'confirmModal',
        ...options,
      };

      props.deps.overlays
        .openConfirm(
          text ||
            i18n.translate('xpack.graph.leaveWorkspace.confirmText', {
              defaultMessage: 'If you leave now, you will lose unsaved changes.',
            }),
          confirmModalOptions
        )
        .then((isConfirmed) => {
          if (isConfirmed) {
            callback();
          }
        });
    },
    [props.deps.overlays, store]
  );

  // Allow URLs to include a user-defined text query
  useEffect(() => {
    if (props.query) {
      setInitialQuery(props.query);
      if (workspace) {
        submit(props.query);
      }
    }
  }, [props.query, submit, workspace]);

  return {
    workspace,
    initialQuery,
    store,
    urlTemplates,
    liveResponseFields,
    loading,
    workspaceInitialized,
    noIndexPatterns,
    submit,
    canWipeWorkspace,
    updateWorkspace,
  };
};
