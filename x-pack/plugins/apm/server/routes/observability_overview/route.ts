/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { getServiceCount } from './get_service_count';
import { getTransactionsPerMinute } from './get_transactions_per_minute';
import { getHasData } from './has_data';
import { rangeRt } from '../default_api_types';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { withApmSpan } from '../../utils/with_apm_span';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const observabilityOverviewHasDataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/observability_overview/has_data',
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    hasData: boolean;
    indices: import('./../../../../observability/common/typings').ApmIndicesConfig;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    return await getHasData({
      indices: apmEventClient.indices,
      apmEventClient,
    });
  },
});

const observabilityOverviewRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/observability_overview',
  params: t.type({
    query: t.intersection([
      rangeRt,
      t.type({ bucketSize: toNumberRt, intervalString: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    serviceCount: number;
    transactionPerMinute:
      | { value: undefined; timeseries: never[] }
      | { value: number; timeseries: Array<{ x: number; y: number | null }> };
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { bucketSize, intervalString, start, end } = resources.params.query;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config: resources.config,
      start,
      end,
      kuery: '',
    });

    return withApmSpan(
      'observability_overview',
      async (): Promise<{
        serviceCount: number;
        transactionPerMinute:
          | { value: undefined; timeseries: never[] }
          | {
              value: number;
              timeseries: Array<{ x: number; y: number | null }>;
            };
      }> => {
        const [serviceCount, transactionPerMinute] = await Promise.all([
          getServiceCount({
            apmEventClient,
            searchAggregatedTransactions,
            start,
            end,
          }),
          getTransactionsPerMinute({
            apmEventClient,
            bucketSize,
            searchAggregatedTransactions,
            start,
            end,
            intervalString,
          }),
        ]);
        return { serviceCount, transactionPerMinute };
      }
    );
  },
});

export const observabilityOverviewRouteRepository = {
  ...observabilityOverviewRoute,
  ...observabilityOverviewHasDataRoute,
};
