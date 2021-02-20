/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { omit } from 'lodash';
import { jsonRt } from '../../common/runtime_types/json_rt';
import { LocalUIFilterName } from '../../common/ui_filter';
import { getEsFilter } from '../lib/helpers/convert_ui_filters/get_es_filter';
import {
  Setup,
  setupRequest,
  SetupTimeRange,
} from '../lib/helpers/setup_request';
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
import { getLocalUIFilters } from '../lib/rum_client/ui_filters/local_ui_filters';
import { localUIFilterNames } from '../lib/rum_client/ui_filters/local_ui_filters/config';
import { getRumPageLoadTransactionsProjection } from '../projections/rum_page_load_transactions';
import { Projection } from '../projections/typings';
import { createRoute } from './create_route';
import { rangeRt, uiFiltersRt } from './default_api_types';
import { APMRequestHandlerContext } from './typings';

export const percentileRangeRt = t.partial({
  minPercentile: t.string,
  maxPercentile: t.string,
});

const uxQueryRt = t.intersection([
  uiFiltersRt,
  rangeRt,
  t.partial({ urlQuery: t.string, percentile: t.string }),
]);

export const rumClientMetricsRoute = createRoute({
  endpoint: 'GET /api/apm/rum/client-metrics',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
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
});

export const rumPageLoadDistributionRoute = createRoute({
  endpoint: 'GET /api/apm/rum-client/page-load-distribution',
  params: t.type({
    query: t.intersection([uxQueryRt, percentileRangeRt]),
  }),
  options: { tags: ['access:apm'] },
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
});

export const rumPageLoadDistBreakdownRoute = createRoute({
  endpoint: 'GET /api/apm/rum-client/page-load-distribution/breakdown',
  params: t.type({
    query: t.intersection([
      uxQueryRt,
      percentileRangeRt,
      t.type({ breakdown: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
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
});

export const rumPageViewsTrendRoute = createRoute({
  endpoint: 'GET /api/apm/rum-client/page-view-trends',
  params: t.type({
    query: t.intersection([uxQueryRt, t.partial({ breakdowns: t.string })]),
  }),
  options: { tags: ['access:apm'] },
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
});

export const rumServicesRoute = createRoute({
  endpoint: 'GET /api/apm/rum-client/services',
  params: t.type({
    query: t.intersection([uiFiltersRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    return getRumServices({ setup });
  },
});

export const rumVisitorsBreakdownRoute = createRoute({
  endpoint: 'GET /api/apm/rum-client/visitor-breakdown',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
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
});

export const rumWebCoreVitals = createRoute({
  endpoint: 'GET /api/apm/rum-client/web-core-vitals',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
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
});

export const rumLongTaskMetrics = createRoute({
  endpoint: 'GET /api/apm/rum-client/long-task-metrics',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
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
});

export const rumUrlSearch = createRoute({
  endpoint: 'GET /api/apm/rum-client/url-search',
  params: t.type({
    query: uxQueryRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      query: { urlQuery, percentile },
    } = context.params;

    return getUrlSearch({ setup, urlQuery, percentile: Number(percentile) });
  },
});

export const rumJSErrors = createRoute({
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
});

export const rumHasDataRoute = createRoute({
  endpoint: 'GET /api/apm/observability_overview/has_rum_data',
  params: t.type({
    query: t.intersection([uiFiltersRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return await hasRumData({ setup });
  },
});

// Everything below here was originally in ui_filters.ts but now is here, since
// UX is the only part of APM using UI filters now.

const filterNamesRt = t.type({
  filterNames: jsonRt.pipe(
    t.array(
      t.keyof(
        Object.fromEntries(
          localUIFilterNames.map((filterName) => [filterName, null])
        ) as Record<LocalUIFilterName, null>
      )
    )
  ),
});

const localUiBaseQueryRt = t.intersection([
  filterNamesRt,
  uiFiltersRt,
  rangeRt,
]);

function createLocalFiltersRoute<
  TEndpoint extends string,
  TProjection extends Projection,
  TQueryRT extends t.HasProps
>({
  endpoint,
  getProjection,
  queryRt,
}: {
  endpoint: TEndpoint;
  getProjection: GetProjection<
    TProjection,
    t.IntersectionC<[TQueryRT, BaseQueryType]>
  >;
  queryRt: TQueryRT;
}) {
  return createRoute({
    endpoint,
    params: t.type({
      query: t.intersection([localUiBaseQueryRt, queryRt]),
    }),
    options: { tags: ['access:apm'] },
    handler: async ({ context, request }) => {
      const setup = await setupRequest(context, request);
      const { uiFilters } = setup;
      const { query } = context.params;

      const { filterNames } = query;
      const projection = await getProjection({
        query,
        context,
        setup: {
          ...setup,
          esFilter: getEsFilter(omit(uiFilters, filterNames)),
        },
      });

      return getLocalUIFilters({
        projection,
        setup,
        uiFilters,
        localFilterNames: filterNames,
      });
    },
  });
}

export const rumOverviewLocalFiltersRoute = createLocalFiltersRoute({
  endpoint: 'GET /api/apm/rum/local_filters',
  getProjection: async ({ setup }) => {
    return getRumPageLoadTransactionsProjection({
      setup,
    });
  },
  queryRt: t.type({}),
});

type BaseQueryType = typeof localUiBaseQueryRt;

type GetProjection<
  TProjection extends Projection,
  TQueryRT extends t.HasProps
> = ({
  query,
  setup,
  context,
}: {
  query: t.TypeOf<TQueryRT>;
  setup: Setup & SetupTimeRange;
  context: APMRequestHandlerContext;
}) => Promise<TProjection> | TProjection;
