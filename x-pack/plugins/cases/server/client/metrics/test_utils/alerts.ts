/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertServiceMock } from '../../../services/mocks';
import { AggregationBuilder } from '../types';
import { AlertHosts, AlertUsers } from '../alerts/aggregations';

export function mockAlertsService() {
  const alertsService = createAlertServiceMock();
  alertsService.executeAggregations.mockImplementation(
    async ({ aggregationBuilders }: { aggregationBuilders: AggregationBuilder[] }) => {
      let result = {};
      for (const builder of aggregationBuilders) {
        switch (builder.constructor) {
          case AlertHosts:
            result = {
              ...result,
              ...createHostsAggsResponse(),
            };
            break;
          case AlertUsers:
            result = {
              ...result,
              ...createUsersAggsResponse(),
            };
            break;
        }
      }
      return result;
    }
  );

  return alertsService;
}

function createHostsAggsResponse() {
  return {
    hosts_total: {
      value: 2,
    },
    hosts_frequency: {
      buckets: [
        {
          key: '1',
          doc_count: 1,
          top_fields: {
            hits: {
              hits: [
                {
                  fields: {
                    'host.name': ['host1'],
                  },
                },
              ],
            },
          },
        },
      ],
    },
  };
}

function createUsersAggsResponse() {
  return {
    users_total: {
      value: 2,
    },
    users_frequency: {
      buckets: [
        {
          key: 'user1',
          doc_count: 1,
        },
      ],
    },
  };
}
