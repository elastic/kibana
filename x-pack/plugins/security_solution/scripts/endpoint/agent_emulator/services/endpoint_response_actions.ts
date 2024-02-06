/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import { BASE_ENDPOINT_ACTION_ROUTE } from '../../../../common/endpoint/constants';
import type { ActionListApiResponse } from '../../../../common/endpoint/types';
import type { EndpointActionListRequestQuery } from '../../../../common/api/endpoint';

export const fetchEndpointActionList = async (
  kbn: KbnClient,
  options: EndpointActionListRequestQuery = {}
): Promise<ActionListApiResponse> => {
  try {
    return (
      await kbn.request<ActionListApiResponse>({
        method: 'GET',
        path: BASE_ENDPOINT_ACTION_ROUTE,
        headers: {
          'Elastic-Api-Version': '2023-10-31',
        },
        query: options,
      })
    ).data;
  } catch (error) {
    // FIXME: remove once the Action List API is fixed (task #5221)
    if (error?.response?.status === 404) {
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        startDate: undefined,
        agentTypes: undefined,
        elasticAgentIds: undefined,
        endDate: undefined,
        userIds: undefined,
        commands: undefined,
        statuses: undefined,
      };
    }

    throw error;
  }
};
