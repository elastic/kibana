/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { Logger } from 'kibana/server';
import { isoToEpochRt } from '@kbn/io-ts-utils';
import { setupRequest, Setup } from '../../lib/helpers/setup_request';
import { getClientMetrics } from './get_client_metrics';
import { getJSErrors } from './get_js_errors';
import { getLongTaskMetrics } from './get_long_task_metrics';
import { getPageLoadDistribution } from './get_page_load_distribution';
import { getPageViewTrends } from './get_page_view_trends';
import { getPageLoadDistBreakdown } from './get_pl_dist_breakdown';
import { getRumServices } from './get_rum_services';
import { getUrlSearch } from './get_url_search';
import { getVisitorBreakdown } from './get_visitor_breakdown';
import { getWebCoreVitals } from './get_web_core_vitals';
import { hasRumData } from './has_rum_data';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { rangeRt } from '../default_api_types';
import { APMRouteHandlerResources } from '../typings';
import { UxUIFilters } from '../../../common/ux_ui_filter';

export type SetupUX = Setup & {
  uiFilters: UxUIFilters;
};

interface SetupRequestParams {
  query: {
    _inspect?: boolean;

    /**
     * Timestamp in ms since epoch
     */
    start?: number;

    /**
     * Timestamp in ms since epoch
     */
    end?: number;
  };
}

type SetupUXRequestParams = Omit<SetupRequestParams, 'query'> & {
  query: SetupRequestParams['query'] & {
    uiFilters?: string;
  };
};

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
  endpoint: 'GET /internal/apm/ux/client-metrics',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    pageViews: { value: number };
    totalPageLoadDuration: { value: number };
    backEnd: { value: number };
    frontEnd: { value: number };
  }> => {
    const setup = await setupUXRequest(resources);

    const {
      query: { urlQuery, percentile, start, end },
    } = resources.params;

    return getClientMetrics({
      setup,
      urlQuery,
      percentile: percentile ? Number(percentile) : undefined,
      start,
      end,
    });
  },
});

const rumPageLoadDistributionRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/ux/page-load-distribution',
  params: t.type({
    query: t.intersection([uxQueryRt, percentileRangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    pageLoadDistribution: {
      pageLoadDistribution: Array<{ x: number; y: number }>;
      percentiles: Record<string, number | null> | undefined;
      minDuration: number;
      maxDuration: number;
    } | null;
  }> => {
    const setup = await setupUXRequest(resources);

    const {
      query: { minPercentile, maxPercentile, urlQuery, start, end },
    } = resources.params;

    const pageLoadDistribution = await getPageLoadDistribution({
      setup,
      minPercentile,
      maxPercentile,
      urlQuery,
      start,
      end,
    });

    return { pageLoadDistribution };
  },
});

const rumPageLoadDistBreakdownRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/ux/page-load-distribution/breakdown',
  params: t.type({
    query: t.intersection([
      uxQueryRt,
      percentileRangeRt,
      t.type({ breakdown: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    pageLoadDistBreakdown:
      | Array<{ name: string; data: Array<{ x: number; y: number }> }>
      | undefined;
  }> => {
    const setup = await setupUXRequest(resources);

    const {
      query: { minPercentile, maxPercentile, breakdown, urlQuery, start, end },
    } = resources.params;

    const pageLoadDistBreakdown = await getPageLoadDistBreakdown({
      setup,
      minPercentile: Number(minPercentile),
      maxPercentile: Number(maxPercentile),
      breakdown,
      urlQuery,
      start,
      end,
    });

    return { pageLoadDistBreakdown };
  },
});

const rumPageViewsTrendRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/ux/page-view-trends',
  params: t.type({
    query: t.intersection([uxQueryRt, t.partial({ breakdowns: t.string })]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ topItems: string[]; items: Array<Record<string, number>> }> => {
    const setup = await setupUXRequest(resources);

    const {
      query: { breakdowns, urlQuery, start, end },
    } = resources.params;

    return getPageViewTrends({
      setup,
      breakdowns,
      urlQuery,
      start,
      end,
    });
  },
});

const rumServicesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/ux/services',
  params: t.type({
    query: t.intersection([uiFiltersRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ rumServices: string[] }> => {
    const setup = await setupUXRequest(resources);
    const {
      query: { start, end },
    } = resources.params;
    const rumServices = await getRumServices({ setup, start, end });
    return { rumServices };
  },
});

const rumVisitorsBreakdownRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/ux/visitor-breakdown',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    os: Array<{ count: number; name: string }>;
    browsers: Array<{ count: number; name: string }>;
  }> => {
    const setup = await setupUXRequest(resources);

    const {
      query: { urlQuery, start, end },
    } = resources.params;

    return getVisitorBreakdown({
      setup,
      urlQuery,
      start,
      end,
    });
  },
});

const rumWebCoreVitals = createApmServerRoute({
  endpoint: 'GET /internal/apm/ux/web-core-vitals',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    coreVitalPages: number;
    cls: number | null;
    fid: number | null | undefined;
    lcp: number | null | undefined;
    tbt: number;
    fcp: number | null | undefined;
    lcpRanks: number[];
    fidRanks: number[];
    clsRanks: number[];
  }> => {
    const setup = await setupUXRequest(resources);

    const {
      query: { urlQuery, percentile, start, end },
    } = resources.params;

    return getWebCoreVitals({
      setup,
      urlQuery,
      percentile: percentile ? Number(percentile) : undefined,
      start,
      end,
    });
  },
});

const rumLongTaskMetrics = createApmServerRoute({
  endpoint: 'GET /internal/apm/ux/long-task-metrics',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    noOfLongTasks: number;
    sumOfLongTasks: number;
    longestLongTask: number;
  }> => {
    const setup = await setupUXRequest(resources);

    const {
      query: { urlQuery, percentile, start, end },
    } = resources.params;

    return getLongTaskMetrics({
      setup,
      urlQuery,
      percentile: percentile ? Number(percentile) : undefined,
      start,
      end,
    });
  },
});

const rumUrlSearch = createApmServerRoute({
  endpoint: 'GET /internal/apm/ux/url-search',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    total: number;
    items: Array<{ url: string; count: number; pld: number }>;
  }> => {
    const setup = await setupUXRequest(resources);

    const {
      query: { urlQuery, percentile, start, end },
    } = resources.params;

    return getUrlSearch({
      setup,
      urlQuery,
      percentile: Number(percentile),
      start,
      end,
    });
  },
});

const rumJSErrors = createApmServerRoute({
  endpoint: 'GET /internal/apm/ux/js-errors',
  params: t.type({
    query: t.intersection([
      uiFiltersRt,
      rangeRt,
      t.type({ pageSize: t.string, pageIndex: t.string }),
      t.partial({ urlQuery: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    totalErrorPages: number;
    totalErrors: number;
    totalErrorGroups: number;
    items:
      | Array<{
          count: number;
          errorGroupId: string | number;
          errorMessage: string;
        }>
      | undefined;
  }> => {
    const setup = await setupUXRequest(resources);

    const {
      query: { pageSize, pageIndex, urlQuery, start, end },
    } = resources.params;

    return getJSErrors({
      setup,
      urlQuery,
      pageSize: Number(pageSize),
      pageIndex: Number(pageIndex),
      start,
      end,
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
  handler: async (
    resources
  ): Promise<{
    indices: string;
    hasData: boolean;
    serviceName: string | number | undefined;
  }> => {
    const setup = await setupUXRequest(resources);
    const {
      query: { start, end },
    } = resources.params;
    return await hasRumData({ setup, start, end });
  },
});

function decodeUiFilters(
  logger: Logger,
  uiFiltersEncoded?: string
): UxUIFilters {
  if (!uiFiltersEncoded) {
    return {};
  }
  try {
    return JSON.parse(uiFiltersEncoded);
  } catch (error) {
    logger.error(error);
    return {};
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function setupUXRequest<TParams extends SetupUXRequestParams>(
  resources: APMRouteHandlerResources & { params: TParams }
) {
  const setup = await setupRequest(resources);
  return {
    ...setup,
    uiFilters: decodeUiFilters(
      resources.logger,
      resources.params.query.uiFilters
    ),
  };
}

export const rumRouteRepository = {
  ...rumClientMetricsRoute,
  ...rumPageLoadDistributionRoute,
  ...rumPageLoadDistBreakdownRoute,
  ...rumPageViewsTrendRoute,
  ...rumServicesRoute,
  ...rumVisitorsBreakdownRoute,
  ...rumWebCoreVitals,
  ...rumLongTaskMetrics,
  ...rumUrlSearch,
  ...rumJSErrors,
  ...rumHasDataRoute,
};
