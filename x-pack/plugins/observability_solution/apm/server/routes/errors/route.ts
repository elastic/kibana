/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  ErrorDistributionResponse,
  getErrorDistribution,
} from './distribution/get_distribution';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import {
  ErrorGroupMainStatisticsResponse,
  getErrorGroupMainStatistics,
} from './get_error_groups/get_error_group_main_statistics';
import {
  ErrorGroupPeriodsResponse,
  getErrorGroupPeriods,
} from './get_error_groups/get_error_group_detailed_statistics';
import {
  ErrorGroupSampleIdsResponse,
  getErrorGroupSampleIds,
} from './get_error_groups/get_error_group_sample_ids';
import {
  ErrorSampleDetailsResponse,
  getErrorSampleDetails,
} from './get_error_groups/get_error_sample_details';
import { offsetRt } from '../../../common/comparison_rt';
import {
  getTopErroneousTransactionsPeriods,
  TopErroneousTransactionsResponse,
} from './erroneous_transactions/get_top_erroneous_transactions';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const errorsMainStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.partial({
        sortField: t.string,
        sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
        searchQuery: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ErrorGroupMainStatisticsResponse> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      sortField,
      sortDirection,
      start,
      end,
      searchQuery,
    } = params.query;

    return await getErrorGroupMainStatistics({
      environment,
      kuery,
      serviceName,
      sortField,
      sortDirection,
      apmEventClient,
      start,
      end,
      searchQuery,
    });
  },
});

const errorsMainStatisticsByTransactionNameRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string,
        transactionName: t.string,
        maxNumberOfErrorGroups: toNumberRt,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ErrorGroupMainStatisticsResponse> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      start,
      end,
      transactionName,
      transactionType,
      maxNumberOfErrorGroups,
    } = params.query;

    return await getErrorGroupMainStatistics({
      environment,
      kuery,
      serviceName,
      apmEventClient,
      start,
      end,
      maxNumberOfErrorGroups,
      transactionName,
      transactionType,
    });
  },
});

const errorsDetailedStatisticsRoute = createApmServerRoute({
  endpoint:
    'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics',
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
  handler: async (resources): Promise<ErrorGroupPeriodsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;

    const {
      path: { serviceName },
      query: { environment, kuery, numBuckets, start, end, offset },
      body: { groupIds },
    } = params;

    return getErrorGroupPeriods({
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

const errorGroupsSamplesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}/samples',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      groupId: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ErrorGroupSampleIdsResponse> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName, groupId } = params.path;
    const { environment, kuery, start, end } = params.query;

    return getErrorGroupSampleIds({
      environment,
      groupId,
      kuery,
      serviceName,
      apmEventClient,
      start,
      end,
    });
  },
});

const errorGroupSampleDetailsRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      groupId: t.string,
      errorId: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ErrorSampleDetailsResponse> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName, errorId } = params.path;
    const { environment, kuery, start, end } = params.query;

    return getErrorSampleDetails({
      environment,
      errorId,
      kuery,
      serviceName,
      apmEventClient,
      start,
      end,
    });
  },
});

const errorDistributionRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/distribution',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.partial({
        groupId: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
      offsetRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ErrorDistributionResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, kuery, groupId, start, end, offset } = params.query;
    return getErrorDistribution({
      environment,
      kuery,
      serviceName,
      groupId,
      apmEventClient,
      start,
      end,
      offset,
    });
  },
});

const topErroneousTransactionsRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      groupId: t.string,
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
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<TopErroneousTransactionsResponse> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);

    const {
      path: { serviceName, groupId },
      query: { environment, kuery, numBuckets, start, end, offset },
    } = params;

    return getTopErroneousTransactionsPeriods({
      environment,
      groupId,
      kuery,
      serviceName,
      apmEventClient,
      start,
      end,
      numBuckets,
      offset,
    });
  },
});

export const errorsRouteRepository = {
  ...errorsMainStatisticsRoute,
  ...errorsMainStatisticsByTransactionNameRoute,
  ...errorsDetailedStatisticsRoute,
  ...errorGroupsSamplesRoute,
  ...errorGroupSampleDetailsRoute,
  ...errorDistributionRoute,
  ...topErroneousTransactionsRoute,
};
