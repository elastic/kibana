/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { rangeRt } from '../default_api_types';
import {
  getObservabilityOverviewData,
  ObservabilityOverviewResponse,
} from './get_observability_overview_data';
import { getHasData, HasDataResponse } from './has_data';

const observabilityOverviewHasDataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/observability_overview/has_data',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<HasDataResponse> => {
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
  handler: async (resources): Promise<ObservabilityOverviewResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { bucketSize, intervalString, start, end } = resources.params.query;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config: resources.config,
      start,
      end,
      kuery: '',
    });

    return getObservabilityOverviewData({
      apmEventClient,
      start,
      end,
      bucketSize,
      intervalString,
      searchAggregatedTransactions,
    });
  },
});

export const observabilityOverviewRouteRepository = {
  ...observabilityOverviewRoute,
  ...observabilityOverviewHasDataRoute,
};
