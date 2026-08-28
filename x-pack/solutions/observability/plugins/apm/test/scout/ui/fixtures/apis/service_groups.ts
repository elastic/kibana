/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-oblt';

export interface ServiceGroupsApiService {
  /**
   * Removes any leftover service group with the given name so the "no service
   * groups initially" assertion is reliable across retries and shared lanes.
   */
  deleteByName: (groupName: string) => Promise<void>;
}

export const getServiceGroupsApiService = ({
  kbnClient,
}: {
  kbnClient: KbnClient;
}): ServiceGroupsApiService => ({
  async deleteByName(groupName: string) {
    const { data } = await kbnClient.request<{
      serviceGroups: Array<{ id: string; groupName: string }>;
    }>({
      method: 'GET',
      path: '/internal/apm/service-groups',
    });

    const matches = data.serviceGroups.filter((group) => group.groupName === groupName);

    for (const { id } of matches) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/internal/apm/service-group?serviceGroupId=${id}`,
        headers: { 'kbn-xsrf': 'scout' },
      });
    }
  },
});
