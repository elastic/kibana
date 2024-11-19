/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../../default_api_types';
import { offsetRt } from '../../../../common/comparison_rt';
import {
  getMobileErrorGroupPeriods,
  MobileErrorGroupPeriodsResponse,
} from './get_mobile_error_group_detailed_statistics';
import {
  MobileErrorGroupMainStatisticsResponse,
  getMobileErrorGroupMainStatistics,
} from './get_mobile_error_group_main_statistics';
import {
  getMobileErrorsTermsByField,
  MobileErrorTermsByFieldResponse,
} from './get_mobile_errors_terms_by_field';
import { MobileHttpErrorsTimeseries, getMobileHttpErrors } from './get_mobile_http_errors';

const mobileMobileHttpRatesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/error/http_error_rate',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<MobileHttpErrorsTimeseries> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, offset } = params.query;
    const response = await getMobileHttpErrors({
      kuery,
      environment,
      start,
      end,
      serviceName,
      apmEventClient,
      offset,
    });

    return { ...response };
  },
});

const mobileErrorsDetailedStatisticsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      offsetRt,
      t.type({
        numBuckets: toNumberRt,
      }),
    ]),
    body: t.type({ groupIds: jsonRt.pipe(t.array(t.string)) }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<MobileErrorGroupPeriodsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;

    const {
      path: { serviceName },
      query: { environment, kuery, numBuckets, start, end, offset },
      body: { groupIds },
    } = params;

    return getMobileErrorGroupPeriods({
      environment,
      kuery,
      serviceName,
      apmEventClient,
      numBuckets,
      groupIds,
      start,
      end,
      offset,
    });
  },
});

const mobileErrorTermsByFieldRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/error_terms',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      t.type({
        size: toNumberRt,
        fieldName: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    terms: MobileErrorTermsByFieldResponse;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, size, fieldName } = params.query;
    const terms = await getMobileErrorsTermsByField({
      kuery,
      environment,
      start,
      end,
      serviceName,
      apmEventClient,
      fieldName,
      size,
    });

    return { terms };
  },
});

const mobileErrorsMainStatisticsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.partial({
        sortField: t.string,
        sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
      }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ errorGroups: MobileErrorGroupMainStatisticsResponse }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName } = params.path;
    const { environment, kuery, sortField, sortDirection, start, end } = params.query;

    const errorGroups = await getMobileErrorGroupMainStatistics({
      environment,
      kuery,
      serviceName,
      sortField,
      sortDirection,
      apmEventClient,
      start,
      end,
    });

    return { errorGroups };
  },
});

export const mobileErrorRoutes = {
  ...mobileMobileHttpRatesRoute,
  ...mobileErrorsMainStatisticsRoute,
  ...mobileErrorsDetailedStatisticsRoute,
  ...mobileErrorTermsByFieldRoute,
};
