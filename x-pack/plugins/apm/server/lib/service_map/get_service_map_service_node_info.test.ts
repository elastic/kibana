/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceMapServiceNodeInfo } from './get_service_map_service_node_info';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import * as getErrorRateModule from '../transaction_groups/get_error_rate';

describe('getServiceMapServiceNodeInfo', () => {
  describe('with no results', () => {
    it('returns null data', async () => {
      const setup = ({
        apmEventClient: {
          search: () =>
            Promise.resolve({
              hits: { total: { value: 0 } },
            }),
        },
        esFilter: [],
        indices: {},
        uiFilters: {},
      } as unknown) as Setup & SetupTimeRange;
      const serviceName = 'test service name';
      const result = await getServiceMapServiceNodeInfo({
        environment: 'test environment',
        setup,
        serviceName,
        searchAggregatedTransactions: false,
      });

      expect(result).toEqual({
        avgCpuUsage: null,
        avgErrorRate: null,
        avgMemoryUsage: null,
        transactionStats: {
          avgRequestsPerMinute: null,
          avgTransactionDuration: null,
        },
      });
    });
  });

  describe('with some results', () => {
    it('returns data', async () => {
      jest.spyOn(getErrorRateModule, 'getErrorRate').mockResolvedValueOnce({
        average: 0.5,
        transactionErrorRate: [],
        noHits: false,
      });

      const setup = ({
        apmEventClient: {
          search: () =>
            Promise.resolve({
              hits: {
                total: { value: 1 },
              },
              aggregations: {
                duration: { value: null },
                avgCpuUsage: { value: null },
                avgMemoryUsage: { value: null },
              },
            }),
        },
        indices: {},
        start: 1593460053026000,
        end: 1593497863217000,
        config: {
          'xpack.apm.metricsInterval': 30,
        },
        uiFilters: { environment: 'test environment' },
      } as unknown) as Setup & SetupTimeRange;
      const serviceName = 'test service name';
      const result = await getServiceMapServiceNodeInfo({
        setup,
        serviceName,
        searchAggregatedTransactions: false,
      });

      expect(result).toEqual({
        avgCpuUsage: null,
        avgErrorRate: 0.5,
        avgMemoryUsage: null,
        transactionStats: {
          avgRequestsPerMinute: 0.000001586873761097901,
          avgTransactionDuration: null,
        },
      });
    });
  });
});
