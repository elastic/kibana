/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { offsetRt } from '../../../common/comparison_rt';
import {
  getMobileHttpRequests,
  HttpRequestsTimeseries,
} from './get_mobile_http_requests';
import { getMobileFilters } from './get_mobile_filters';
import { getMobileSessions, SessionsTimeseries } from './get_mobile_sessions';
import { getMobileStatsPeriods, MobilePeriodStats } from './get_mobile_stats';

const mobileFiltersRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/mobile/filters',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      t.partial({
        transactionType: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    mobileFilters: Awaited<ReturnType<typeof getMobileFilters>>;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, transactionType } = params.query;

    const filters = await getMobileFilters({
      kuery,
      environment,
      transactionType,
      start,
      end,
      serviceName,
      apmEventClient,
    });
    return { mobileFilters: filters };
  },
});

const mobileStatsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/stats',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      t.partial({
        transactionType: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<MobilePeriodStats> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end } = params.query;

    const stats = await getMobileStatsPeriods({
      kuery,
      environment,
      start,
      end,
      serviceName,
      apmEventClient,
    });

    return stats;
  },
});

const sessionsChartRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/mobile-services/{serviceName}/transactions/charts/sessions',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      offsetRt,
      t.partial({
        transactionType: t.string,
        transactionName: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<SessionsTimeseries> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, transactionName, offset } =
      params.query;

    const { currentPeriod, previousPeriod } = await getMobileSessions({
      kuery,
      environment,
      transactionName,
      start,
      end,
      serviceName,
      apmEventClient,
      offset,
    });

    return { currentPeriod, previousPeriod };
  },
});

const httpRequestsChartRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/mobile-services/{serviceName}/transactions/charts/http_requests',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      offsetRt,
      t.partial({
        transactionType: t.string,
        transactionName: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<HttpRequestsTimeseries> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, transactionName, offset } =
      params.query;

    const { currentPeriod, previousPeriod } = await getMobileHttpRequests({
      kuery,
      environment,
      transactionName,
      start,
      end,
      serviceName,
      apmEventClient,
      offset,
    });

    return { currentPeriod, previousPeriod };
  },
});

export const mobileRouteRepository = {
  ...mobileFiltersRoute,
  ...sessionsChartRoute,
  ...httpRequestsChartRoute,
  ...mobileStatsRoute,
};
