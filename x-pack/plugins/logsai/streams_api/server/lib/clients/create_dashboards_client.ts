/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsFindResult } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { StreamsAPIRouteHandlerResources } from '../../routes/types';

interface DashboardsClient {
  getAllDashboards: () => Promise<Array<SavedObjectsFindResult<DashboardAttributes>>>;
  getDashboardsById: (ids: string[]) => Promise<Array<SavedObject<DashboardAttributes>>>;
}

export async function createDashboardsClient(
  resources: Pick<StreamsAPIRouteHandlerResources, 'request' | 'context'>
): Promise<DashboardsClient> {
  const soClient = (await resources.context.core).savedObjects.client;
  async function getDashboards(
    page: number
  ): Promise<Array<SavedObjectsFindResult<DashboardAttributes>>> {
    const perPage = 1000;

    const response = await soClient.find<DashboardAttributes>({
      type: 'dashboard',
      perPage,
      page,
    });

    const fetchedUntil = (page - 1) * perPage + response.saved_objects.length;

    if (response.total <= fetchedUntil) {
      return response.saved_objects;
    }
    return [...response.saved_objects, ...(await getDashboards(page + 1))];
  }

  return {
    getDashboardsById: async (ids: string[]) => {
      const response = await soClient.bulkGet(ids.map((id) => ({ type: 'dashboard', id })));

      return response.saved_objects as Array<SavedObject<DashboardAttributes>>;
    },
    getAllDashboards: async () => {
      return await getDashboards(1);
    },
  };
}
