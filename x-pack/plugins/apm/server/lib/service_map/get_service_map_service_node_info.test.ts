/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServiceMapServiceNodeInfo } from './get_service_map_service_node_info';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import * as getErrorRateModule from '../transaction_groups/get_error_rate';

describe('getServiceMapServiceNodeInfo', () => {
  describe('with no results', () => {
    it('returns null data', async () => {
      const setup = ({
        client: {
          search: () =>
            Promise.resolve({
              hits: { total: { value: 0 } },
            }),
        },
        indices: {},
      } as unknown) as Setup & SetupTimeRange;
      const environment = 'test environment';
      const serviceName = 'test service name';
      const result = await getServiceMapServiceNodeInfo({
        uiFilters: { environment },
        setup,
        serviceName,
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
        erroneousTransactionsRate: [],
        noHits: false,
      });

      const setup = ({
        client: {
          search: () =>
            Promise.resolve({
              hits: { total: { value: 1 } },
            }),
        },
        indices: {},
        start: 1593460053026000,
        end: 1593497863217000,
      } as unknown) as Setup & SetupTimeRange;
      const environment = 'test environment';
      const serviceName = 'test service name';
      const result = await getServiceMapServiceNodeInfo({
        uiFilters: { environment },
        setup,
        serviceName,
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
