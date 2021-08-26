/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { GraphServices } from '../application';
import { Listing } from '../components/listing';
import { deleteSavedWorkspace, findSavedWorkspace } from '../helpers/saved_workspace_utils';
import { getEditPath, getEditUrl, getNewPath, setBreadcrumbs } from '../services/url';
import { GraphWorkspaceSavedObject } from '../types';

interface ListingRouteProps {
  deps: GraphServices;
}

export const ListingRoute = ({ deps }: ListingRouteProps) => {
  const { chrome, savedObjects, savedObjectsClient, coreStart, capabilities, addBasePath } = deps;
  const listingLimit = savedObjects.settings.getListingLimit();
  const history = useHistory();
  const query = new URLSearchParams(useLocation().search);
  const initialFilter = query.get('filter') || '';

  useEffect(() => {
    setBreadcrumbs({ chrome });
  }, [chrome]);

  const create = () => {
    history.push(getNewPath());
  };

  const find = (search: string) => {
    return findSavedWorkspace(
      { savedObjectsClient, basePath: coreStart.http.basePath },
      search,
      listingLimit
    );
  };

  const editItem = (savedWorkspace: GraphWorkspaceSavedObject) => {
    history.push(getEditPath(savedWorkspace));
  };

  const getViewUrl = (savedWorkspace: GraphWorkspaceSavedObject) =>
    getEditUrl(addBasePath, savedWorkspace);

  const deleteItems = (savedWorkspaces: GraphWorkspaceSavedObject[]) => {
    return deleteSavedWorkspace(
      savedObjectsClient,
      savedWorkspaces.map((cur) => cur.id!)
    );
  };

  return (
    <Listing
      listingLimit={listingLimit}
      initialPageSize={savedObjects.settings.getPerPage()}
      capabilities={capabilities}
      createItem={create}
      findItems={find}
      editItem={editItem}
      getViewUrl={getViewUrl}
      deleteItems={deleteItems}
      coreStart={coreStart}
      initialFilter={initialFilter}
    />
  );
};
