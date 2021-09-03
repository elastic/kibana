/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, ToastsStart } from 'kibana/public';
import { useEffect, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { GraphStore } from '../state_management';
import { GraphWorkspaceSavedObject, IndexPatternSavedObject, Workspace } from '../types';
import { getEmptyWorkspace, getSavedWorkspace } from './saved_workspace_utils';

interface UseWorkspaceLoaderProps {
  store: GraphStore;
  workspaceRef: React.MutableRefObject<Workspace | undefined>;
  savedObjectsClient: SavedObjectsClientContract;
  toastNotifications: ToastsStart;
}

interface WorkspaceUrlParams {
  id?: string;
}
export interface SharingSavedObjectProps {
  outcome?: 'aliasMatch' | 'exactMatch' | 'conflict';
  aliasTargetId?: string;
}

export const useWorkspaceLoader = ({
  workspaceRef,
  store,
  savedObjectsClient,
  toastNotifications,
}: UseWorkspaceLoaderProps) => {
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternSavedObject[]>();
  const [savedWorkspace, setSavedWorkspace] = useState<GraphWorkspaceSavedObject>();
  const [sharingSavedObjectProps, setSharingSavedObjectProps] = useState<SharingSavedObjectProps>();
  const history = useHistory();
  const location = useLocation();
  const { id } = useParams<WorkspaceUrlParams>();

  /**
   * The following effect initializes workspace initially and reacts
   * on changes in id parameter and URL query only.
   */
  useEffect(() => {
    const urlQuery = new URLSearchParams(location.search).get('query');

    function loadWorkspace(
      fetchedSavedWorkspace: GraphWorkspaceSavedObject,
      fetchedIndexPatterns: IndexPatternSavedObject[]
    ) {
      store.dispatch({
        type: 'x-pack/graph/LOAD_WORKSPACE',
        payload: {
          savedWorkspace: fetchedSavedWorkspace,
          indexPatterns: fetchedIndexPatterns,
          urlQuery,
        },
      });
    }

    function clearStore() {
      store.dispatch({ type: 'x-pack/graph/RESET' });
    }

    async function fetchIndexPatterns() {
      return await savedObjectsClient
        .find<{ title: string }>({
          type: 'index-pattern',
          fields: ['title', 'type'],
          perPage: 10000,
        })
        .then((response) => response.savedObjects);
    }

    async function fetchSavedWorkspace(): Promise<{
      savedObject: GraphWorkspaceSavedObject;
      sharingSavedObjectProps?: SharingSavedObjectProps;
    }> {
      return id
        ? await getSavedWorkspace(savedObjectsClient, id).catch(function (e) {
            toastNotifications.addError(e, {
              title: i18n.translate('xpack.graph.missingWorkspaceErrorMessage', {
                defaultMessage: "Couldn't load graph with ID",
              }),
            });
            history.replace('/home');
            // return promise that never returns to prevent the controller from loading
            return new Promise(() => {});
          })
        : getEmptyWorkspace();
    }

    async function initializeWorkspace() {
      const fetchedIndexPatterns = await fetchIndexPatterns();
      const {
        savedObject: fetchedSavedWorkspace,
        sharingSavedObjectProps: fetchedSharingSavedObjectProps,
      } = await fetchSavedWorkspace();

      /**
       * Deal with situation of request to open saved workspace. Otherwise clean up store,
       * when navigating to a new workspace from existing one.
       */
      if (fetchedSavedWorkspace.id) {
        loadWorkspace(fetchedSavedWorkspace, fetchedIndexPatterns);
      } else if (workspaceRef.current) {
        clearStore();
      }

      setIndexPatterns(fetchedIndexPatterns);
      setSavedWorkspace(fetchedSavedWorkspace);
      setSharingSavedObjectProps(fetchedSharingSavedObjectProps);
    }

    initializeWorkspace();
  }, [
    id,
    location,
    store,
    history,
    savedObjectsClient,
    setSavedWorkspace,
    toastNotifications,
    workspaceRef,
  ]);

  return { savedWorkspace, indexPatterns, sharingSavedObjectProps };
};
