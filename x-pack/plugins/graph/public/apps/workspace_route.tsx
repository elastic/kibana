/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { GraphServices } from '../application';
import { getSavedWorkspace } from '../helpers/saved_workspace_utils';
import { GraphWorkspace } from '../components/graph_workspace';
import { GraphWorkspaceSavedObject, IndexPatternSavedObject } from '../types';
import { createCachedIndexPatternProvider } from '../services/index_pattern_cache';

interface WorkspaceRouteProps {
  deps: GraphServices;
}

interface WorkspaceUrlParams {
  id?: string;
}

export const WorkspaceRoute = ({ deps }: WorkspaceRouteProps) => {
  const { savedObjectsClient, toastNotifications, indexPatterns: getIndexPatternProvider } = deps;
  const history = useHistory();
  const { id } = useParams<WorkspaceUrlParams>();
  const query = new URLSearchParams(useLocation().search);
  const [savedWorkspace, setSavedWorkspace] = useState<GraphWorkspaceSavedObject>();
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternSavedObject[]>();
  const indexPatternProvider = createCachedIndexPatternProvider(getIndexPatternProvider.get);
  const urlQuery = query.get('query');

  useEffect(() => {
    const fetchSavedWorkspace = async () => {
      const workspace = id
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
        : await getSavedWorkspace(savedObjectsClient);

      setSavedWorkspace(workspace as GraphWorkspaceSavedObject);
    };

    fetchSavedWorkspace();
  }, [history, id, savedObjectsClient, toastNotifications]);

  useEffect(() => {
    async function fetchIndexPatterns() {
      const fetchedIndexPatterns = await savedObjectsClient
        .find<{ title: string }>({
          type: 'index-pattern',
          fields: ['title', 'type'],
          perPage: 10000,
        })
        .then((response) => response.savedObjects);
      setIndexPatterns(fetchedIndexPatterns);
    }
    fetchIndexPatterns();
  }, [savedObjectsClient]);

  if (!indexPatterns || !savedWorkspace) {
    return null;
  }

  return (
    <GraphWorkspace
      indexPatternProvider={indexPatternProvider}
      indexPatterns={indexPatterns}
      savedWorkspace={savedWorkspace}
      urlQuery={urlQuery}
      deps={deps}
    />
  );
};
