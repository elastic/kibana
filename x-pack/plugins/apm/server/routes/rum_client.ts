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
import { getPageLoadDistBreakdown } from '../lib/rum_client/get_pl_dist_breakdown';
import { getRumServices } from '../lib/rum_client/get_rum_services';
import { getVisitorBreakdown } from '../lib/rum_client/get_visitor_breakdown';
import { getWebCoreVitals } from '../lib/rum_client/get_web_core_vitals';
import { getLongTaskMetrics } from '../lib/rum_client/get_long_task_metrics';
import { getUrlSearch } from '../lib/rum_client/get_url_search';

export const percentileRangeRt = t.partial({
  minPercentile: t.string,
  maxPercentile: t.string,
});

const urlQueryRt = t.partial({ urlQuery: t.string });

export const rumClientMetricsRoute = createRoute(() => ({
  path: '/api/apm/rum/client-metrics',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt, urlQueryRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery },
    } = context.params;

    return getClientMetrics({ setup, urlQuery });
  },
}));

export const rumPageLoadDistributionRoute = createRoute(() => ({
  path: '/api/apm/rum-client/page-load-distribution',
  params: {
    query: t.intersection([
      uiFiltersRt,
      rangeRt,
      percentileRangeRt,
      urlQueryRt,
    ]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { minPercentile, maxPercentile, urlQuery },
    } = context.params;

    return getPageLoadDistribution({
      setup,
      minPercentile,
      maxPercentile,
      urlQuery,
    });
  },
}));

export const rumPageLoadDistBreakdownRoute = createRoute(() => ({
  path: '/api/apm/rum-client/page-load-distribution/breakdown',
  params: {
    query: t.intersection([
      uiFiltersRt,
      rangeRt,
      percentileRangeRt,
      urlQueryRt,
      t.type({ breakdown: t.string }),
    ]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { minPercentile, maxPercentile, breakdown, urlQuery },
    } = context.params;

    return getPageLoadDistBreakdown({
      setup,
      minDuration: Number(minPercentile),
      maxDuration: Number(maxPercentile),
      breakdown,
      urlQuery,
    });
  },
}));

export const rumPageViewsTrendRoute = createRoute(() => ({
  path: '/api/apm/rum-client/page-view-trends',
  params: {
    query: t.intersection([
      uiFiltersRt,
      rangeRt,
      urlQueryRt,
      t.partial({ breakdowns: t.string }),
    ]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { breakdowns, urlQuery },
    } = context.params;

    return getPageViewTrends({ setup, breakdowns, urlQuery });
  },
}));

export const rumServicesRoute = createRoute(() => ({
  path: '/api/apm/rum-client/services',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    return getRumServices({ setup });
  },
}));

export const rumVisitorsBreakdownRoute = createRoute(() => ({
  path: '/api/apm/rum-client/visitor-breakdown',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt, urlQueryRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery },
    } = context.params;

    return getVisitorBreakdown({ setup, urlQuery });
  },
}));

export const rumWebCoreVitals = createRoute(() => ({
  path: '/api/apm/rum-client/web-core-vitals',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt, urlQueryRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery },
    } = context.params;

    return getWebCoreVitals({ setup, urlQuery });
  },
}));

export const rumLongTaskMetrics = createRoute(() => ({
  path: '/api/apm/rum-client/long-task-metrics',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt, urlQueryRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery },
    } = context.params;

    return getLongTaskMetrics({ setup, urlQuery });
  },
}));

export const rumUrlSearch = createRoute(() => ({
  path: '/api/apm/rum-client/url-search',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt, urlQueryRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery },
    } = context.params;

    return getUrlSearch({ setup, urlQuery });
  },
}));
