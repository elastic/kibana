/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

export interface PartialDashboardAttributes {
  title: string;
}

export interface DashboardSearchResponse {
  dashboards: Array<{
    id: string;
    title: string;
  }>;
}

export const findDashboards = async (
  savedObjectsClient: SavedObjectsClientContract,
  query: string = '',
  fields: string[] = []
): Promise<DashboardSearchResponse> => {
  const result = await savedObjectsClient.find<PartialDashboardAttributes>({
    type: 'dashboard',
    search: `${query}*`,
    searchFields: fields,
  });

  return {
    dashboards: result.saved_objects.map((db) => ({
      title: db.attributes.title,
      id: db.id,
    })),
  };
};
