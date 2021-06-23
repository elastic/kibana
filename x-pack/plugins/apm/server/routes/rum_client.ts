/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isoToEpochRt } from '@kbn/io-ts-utils';
import { setupRequest } from '../lib/helpers/setup_request';
import { getClientMetrics } from '../lib/rum_client/get_client_metrics';
import { getJSErrors } from '../lib/rum_client/get_js_errors';
import { getLongTaskMetrics } from '../lib/rum_client/get_long_task_metrics';
import { getPageLoadDistribution } from '../lib/rum_client/get_page_load_distribution';
import { getPageViewTrends } from '../lib/rum_client/get_page_view_trends';
import { getPageLoadDistBreakdown } from '../lib/rum_client/get_pl_dist_breakdown';
import { getRumServices } from '../lib/rum_client/get_rum_services';
import { getUrlSearch } from '../lib/rum_client/get_url_search';
import { getVisitorBreakdown } from '../lib/rum_client/get_visitor_breakdown';
import { getWebCoreVitals } from '../lib/rum_client/get_web_core_vitals';
import { hasRumData } from '../lib/rum_client/has_rum_data';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { rangeRt } from './default_api_types';

export const percentileRangeRt = t.partial({
  minPercentile: t.string,
  maxPercentile: t.string,
});

const uiFiltersRt = t.type({ uiFilters: t.string });

const uxQueryRt = t.intersection([
  uiFiltersRt,
  rangeRt,
  t.partial({ urlQuery: t.string, percentile: t.string }),
]);

const rumClientMetricsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/rum/client-metrics',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const {
      query: { urlQuery, percentile },
    } = resources.params;

    return getClientMetrics({
      setup,
      urlQuery,
      percentile: percentile ? Number(percentile) : undefined,
    });
  },
});

const rumPageLoadDistributionRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/rum-client/page-load-distribution',
  params: t.type({
    query: t.intersection([uxQueryRt, percentileRangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const {
      query: { minPercentile, maxPercentile, urlQuery },
    } = resources.params;

    const pageLoadDistribution = await getPageLoadDistribution({
      setup,
      minPercentile,
      maxPercentile,
      urlQuery,
    });

    return { pageLoadDistribution };
  },
});

const rumPageLoadDistBreakdownRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/rum-client/page-load-distribution/breakdown',
  params: t.type({
    query: t.intersection([
      uxQueryRt,
      percentileRangeRt,
      t.type({ breakdown: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const {
      query: { minPercentile, maxPercentile, breakdown, urlQuery },
    } = resources.params;

    const pageLoadDistBreakdown = await getPageLoadDistBreakdown({
      setup,
      minPercentile: Number(minPercentile),
      maxPercentile: Number(maxPercentile),
      breakdown,
      urlQuery,
    });

    return { pageLoadDistBreakdown };
  },
});

const rumPageViewsTrendRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/rum-client/page-view-trends',
  params: t.type({
    query: t.intersection([uxQueryRt, t.partial({ breakdowns: t.string })]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const {
      query: { breakdowns, urlQuery },
    } = resources.params;

    return getPageViewTrends({
      setup,
      breakdowns,
      urlQuery,
    });
  },
});

const rumServicesRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/rum-client/services',
  params: t.type({
    query: t.intersection([uiFiltersRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const rumServices = await getRumServices({ setup });
    return { rumServices };
  },
});

const rumVisitorsBreakdownRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/rum-client/visitor-breakdown',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const {
      query: { urlQuery },
    } = resources.params;

    return getVisitorBreakdown({
      setup,
      urlQuery,
    });
  },
});

const rumWebCoreVitals = createApmServerRoute({
  endpoint: 'GET /api/apm/rum-client/web-core-vitals',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const {
      query: { urlQuery, percentile },
    } = resources.params;

    return getWebCoreVitals({
      setup,
      urlQuery,
      percentile: percentile ? Number(percentile) : undefined,
    });
  },
});

const rumLongTaskMetrics = createApmServerRoute({
  endpoint: 'GET /api/apm/rum-client/long-task-metrics',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const {
      query: { urlQuery, percentile },
    } = resources.params;

    return getLongTaskMetrics({
      setup,
      urlQuery,
      percentile: percentile ? Number(percentile) : undefined,
    });
  },
});

const rumUrlSearch = createApmServerRoute({
  endpoint: 'GET /api/apm/rum-client/url-search',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const {
      query: { urlQuery, percentile },
    } = resources.params;

    return getUrlSearch({ setup, urlQuery, percentile: Number(percentile) });
  },
});

const rumJSErrors = createApmServerRoute({
  endpoint: 'GET /api/apm/rum-client/js-errors',
  params: t.type({
    query: t.intersection([
      uiFiltersRt,
      rangeRt,
      t.type({ pageSize: t.string, pageIndex: t.string }),
      t.partial({ urlQuery: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const {
      query: { pageSize, pageIndex, urlQuery },
    } = resources.params;

    return getJSErrors({
      setup,
      urlQuery,
      pageSize: Number(pageSize),
      pageIndex: Number(pageIndex),
    });
  },
});

const rumHasDataRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/observability_overview/has_rum_data',
  params: t.partial({
    query: t.partial({
      uiFilters: t.string,
      start: isoToEpochRt,
      end: isoToEpochRt,
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    return await hasRumData({ setup });
  },
});

export const rumRouteRepository = createApmServerRouteRepository()
  .add(rumClientMetricsRoute)
  .add(rumPageLoadDistributionRoute)
  .add(rumPageLoadDistBreakdownRoute)
  .add(rumPageViewsTrendRoute)
  .add(rumServicesRoute)
  .add(rumVisitorsBreakdownRoute)
  .add(rumWebCoreVitals)
  .add(rumLongTaskMetrics)
  .add(rumUrlSearch)
  .add(rumJSErrors)
  .add(rumHasDataRoute);
