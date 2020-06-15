/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { createRoute } from './create_route';
import { setupRequest } from '../lib/helpers/setup_request';
import { getClientMetrics } from '../lib/rum_client/get_client_metrics';
import { rangeRt, uiFiltersRt } from './default_api_types';
import { getPageViewTrends } from '../lib/rum_client/get_page_view_trends';
import { getPageLoadDistribution } from '../lib/rum_client/get_page_load_distribution';

export const percentileRangeRt = t.partial({
  minPercentile: t.string,
  maxPercentile: t.string,
});

export const rumClientMetricsRoute = createRoute(() => ({
  path: '/api/apm/rum/client-metrics',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    return getClientMetrics({ setup });
  },
}));

export const rumPageLoadDistributionRoute = createRoute(() => ({
  path: '/api/apm/rum-client/page-load-distribution',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt, percentileRangeRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { minPercentile, maxPercentile },
    } = context.params;

    return getPageLoadDistribution({ setup, minPercentile, maxPercentile });
  },
}));

export const rumPageViewsTrendRoute = createRoute(() => ({
  path: '/api/apm/rum-client/page-view-trends',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return getPageViewTrends({ setup });
  },
}));
