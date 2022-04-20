/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/public';
import type { SavedObjectsResolveResponse } from '@kbn/core/public';
import { useEffect, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core/public';
import { SpacesApi } from '@kbn/spaces-plugin/public';
import { GraphStore } from '../state_management';
import { GraphWorkspaceSavedObject, IndexPatternSavedObject, Workspace } from '../types';
import { getEmptyWorkspace, getSavedWorkspace } from './saved_workspace_utils';
import { getEditUrl } from '../services/url';
export interface UseWorkspaceLoaderProps {
  store: GraphStore;
  workspaceRef: React.MutableRefObject<Workspace | undefined>;
  savedObjectsClient: SavedObjectsClientContract;
  coreStart: CoreStart;
  spaces?: SpacesApi;
}

interface WorkspaceUrlParams {
  id?: string;
}
export interface SharingSavedObjectProps {
  outcome?: SavedObjectsResolveResponse['outcome'];
  aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
  aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
}

interface WorkspaceLoadedState {
  savedWorkspace: GraphWorkspaceSavedObject;
  indexPatterns: IndexPatternSavedObject[];
  sharingSavedObjectProps?: SharingSavedObjectProps;
}

export const useWorkspaceLoader = ({
  coreStart,
  spaces,
  workspaceRef,
  store,
  savedObjectsClient,
}: UseWorkspaceLoaderProps) => {
  const [state, setState] = useState<WorkspaceLoadedState>();
  const { replace: historyReplace } = useHistory();
  const { search } = useLocation();
  const { id } = useParams<WorkspaceUrlParams>();

  /**
   * The following effect initializes workspace initially and reacts
   * on changes in id parameter and URL query only.
   */
  useEffect(() => {
    const urlQuery = new URLSearchParams(search).get('query');

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

    async function* pageThroughIndexPatterns() {
      let perPage = 1000;
      let total = 0;
      let savedObjects: IndexPatternSavedObject[] = [];

      async function* makeRequest(page: number): AsyncGenerator<IndexPatternSavedObject[]> {
        await savedObjectsClient
          .find<{ title: string }>({
            type: 'index-pattern',
            fields: ['title', 'type'],
            perPage,
            page,
          })
          .then((response) => {
            perPage = response.perPage;
            total = response.total;
            savedObjects = response.savedObjects;
          });

        yield savedObjects;

        if (total > page * perPage) {
          yield* makeRequest(++page);
        }
      }
      yield* makeRequest(1);
    }

    async function fetchIndexPatterns() {
      const result = pageThroughIndexPatterns();
      let fetchedIndexPatterns: IndexPatternSavedObject[] = [];
      for await (const page of result) {
        fetchedIndexPatterns = fetchedIndexPatterns.concat(page);
      }
      return fetchedIndexPatterns;
    }

    async function fetchSavedWorkspace(): Promise<{
      savedObject: GraphWorkspaceSavedObject;
      sharingSavedObjectProps?: SharingSavedObjectProps;
    }> {
      return id
        ? await getSavedWorkspace(savedObjectsClient, id).catch(function (e) {
            coreStart.notifications.toasts.addError(e, {
              title: i18n.translate('xpack.graph.missingWorkspaceErrorMessage', {
                defaultMessage: "Couldn't load graph with ID",
              }),
            });
            historyReplace('/home');
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

      if (spaces && fetchedSharingSavedObjectProps?.outcome === 'aliasMatch') {
        // We found this object by a legacy URL alias from its old ID; redirect the user to the page with its new ID, preserving any URL hash
        const newObjectId = fetchedSharingSavedObjectProps.aliasTargetId!; // This is always defined if outcome === 'aliasMatch'
        const newPath = getEditUrl(coreStart.http.basePath.prepend, { id: newObjectId }) + search;
        spaces.ui.redirectLegacyUrl({
          path: newPath,
          aliasPurpose: fetchedSharingSavedObjectProps.aliasPurpose,
          objectNoun: i18n.translate('xpack.graph.legacyUrlConflict.objectNoun', {
            defaultMessage: 'Graph',
          }),
        });
        return null;
      }

      /**
       * Deal with situation of request to open saved workspace. Otherwise clean up store,
       * when navigating to a new workspace from existing one.
       */
      if (fetchedSavedWorkspace.id) {
        loadWorkspace(fetchedSavedWorkspace, fetchedIndexPatterns);
      } else if (workspaceRef.current) {
        clearStore();
      }
      setState({
        savedWorkspace: fetchedSavedWorkspace,
        indexPatterns: fetchedIndexPatterns,
        sharingSavedObjectProps: fetchedSharingSavedObjectProps,
      });
    }

    initializeWorkspace();
  }, [
    id,
    search,
    store,
    historyReplace,
    savedObjectsClient,
    setState,
    coreStart,
    workspaceRef,
    spaces,
  ]);

  return state;
};
