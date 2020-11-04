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
import { getJSErrors } from '../lib/rum_client/get_js_errors';
import { getLongTaskMetrics } from '../lib/rum_client/get_long_task_metrics';
import { getUrlSearch } from '../lib/rum_client/get_url_search';
import { hasRumData } from '../lib/rum_client/has_rum_data';

export const percentileRangeRt = t.partial({
  minPercentile: t.string,
  maxPercentile: t.string,
});

const uxQueryRt = t.intersection([
  uiFiltersRt,
  rangeRt,
  t.partial({ urlQuery: t.string, percentile: t.string }),
]);

export const rumClientMetricsRoute = createRoute(() => ({
  path: '/api/apm/rum/client-metrics',
  params: {
    query: uxQueryRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery, percentile },
    } = context.params;

    return getClientMetrics({
      setup,
      urlQuery,
      percentile: percentile ? Number(percentile) : undefined,
    });
  },
}));

export const rumPageLoadDistributionRoute = createRoute(() => ({
  path: '/api/apm/rum-client/page-load-distribution',
  params: {
    query: t.intersection([uxQueryRt, percentileRangeRt]),
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
      uxQueryRt,
      percentileRangeRt,
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
      minPercentile: Number(minPercentile),
      maxPercentile: Number(maxPercentile),
      breakdown,
      urlQuery,
    });
  },
}));

export const rumPageViewsTrendRoute = createRoute(() => ({
  path: '/api/apm/rum-client/page-view-trends',
  params: {
    query: t.intersection([uxQueryRt, t.partial({ breakdowns: t.string })]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { breakdowns, urlQuery },
    } = context.params;

    return getPageViewTrends({
      setup,
      breakdowns,
      urlQuery,
    });
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
    query: uxQueryRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery },
    } = context.params;

    return getVisitorBreakdown({
      setup,
      urlQuery,
    });
  },
}));

export const rumWebCoreVitals = createRoute(() => ({
  path: '/api/apm/rum-client/web-core-vitals',
  params: {
    query: uxQueryRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery, percentile },
    } = context.params;

    return getWebCoreVitals({
      setup,
      urlQuery,
      percentile: percentile ? Number(percentile) : undefined,
    });
  },
}));

export const rumLongTaskMetrics = createRoute(() => ({
  path: '/api/apm/rum-client/long-task-metrics',
  params: {
    query: uxQueryRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery, percentile },
    } = context.params;

    return getLongTaskMetrics({
      setup,
      urlQuery,
      percentile: percentile ? Number(percentile) : undefined,
    });
  },
}));

export const rumUrlSearch = createRoute(() => ({
  path: '/api/apm/rum-client/url-search',
  params: {
    query: uxQueryRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery, percentile },
    } = context.params;

    return getUrlSearch({ setup, urlQuery, percentile: Number(percentile) });
  },
}));

export const rumJSErrors = createRoute(() => ({
  path: '/api/apm/rum-client/js-errors',
  params: {
    query: t.intersection([
      uiFiltersRt,
      rangeRt,
      t.type({ pageSize: t.string, pageIndex: t.string }),
      t.partial({ urlQuery: t.string }),
    ]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { pageSize, pageIndex, urlQuery },
    } = context.params;

    return getJSErrors({
      setup,
      urlQuery,
      pageSize: Number(pageSize),
      pageIndex: Number(pageIndex),
    });
  },
}));

export const rumHasDataRoute = createRoute(() => ({
  path: '/api/apm/observability_overview/has_rum_data',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return await hasRumData({ setup });
  },
}));
