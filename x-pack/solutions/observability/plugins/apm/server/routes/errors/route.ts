/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import {
  routeDefinitions,
  type ErrorGroupMainStatisticsResponse,
  type ErrorGroupPeriodsResponse,
  type ErrorGroupSampleIdsResponse,
  type ErrorSampleDetailsResponse,
  type ErrorDistributionResponse,
  type TopErroneousTransactionsResponse,
} from '@kbn/apm-api-shared';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getErrorDistribution } from './distribution/get_distribution';
import { getErrorGroupMainStatistics } from './get_error_groups/get_error_group_main_statistics';
import { getErrorGroupPeriods } from './get_error_groups/get_error_group_detailed_statistics';
import { getErrorGroupSampleIds } from './get_error_groups/get_error_group_sample_ids';
import { getErrorSampleDetails } from './get_error_groups/get_error_sample_details';
import { getTopErroneousTransactionsPeriods } from './erroneous_transactions/get_top_erroneous_transactions';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const errorsMainStatisticsRoute = createApmServerRoute({
  endpoint: routeDefinitions.errors.mainStatistics.endpoint,
  params: routeDefinitions.errors.mainStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ErrorGroupMainStatisticsResponse> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName } = params.path;
    const { environment, kuery, sortField, sortDirection, start, end, searchQuery } = params.query;

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
  endpoint: routeDefinitions.errors.mainStatisticsByTransactionName.endpoint,
  params: routeDefinitions.errors.mainStatisticsByTransactionName.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  endpoint: routeDefinitions.errors.detailedStatistics.endpoint,
  params: routeDefinitions.errors.detailedStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  endpoint: routeDefinitions.errors.groupSamples.endpoint,
  params: routeDefinitions.errors.groupSamples.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  endpoint: routeDefinitions.errors.sampleDetails.endpoint,
  params: routeDefinitions.errors.sampleDetails.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ErrorSampleDetailsResponse> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName, errorId } = params.path;
    const { environment, kuery, start, end } = params.query;

    const { transaction, error } = await getErrorSampleDetails({
      environment,
      errorId,
      kuery,
      serviceName,
      apmEventClient,
      start,
      end,
    });

    if (!error) {
      throw notFound();
    }

    return { error, transaction };
  },
});

const errorDistributionRoute = createApmServerRoute({
  endpoint: routeDefinitions.errors.distribution.endpoint,
  params: routeDefinitions.errors.distribution.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ErrorDistributionResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      groupId,
      transactionName,
      start,
      end,
      offset,
      bucketSizeInSeconds,
    } = params.query;
    return getErrorDistribution({
      environment,
      kuery,
      serviceName,
      groupId,
      transactionName,
      apmEventClient,
      start,
      end,
      offset,
      bucketSizeInSeconds,
    });
  },
});

const topErroneousTransactionsRoute = createApmServerRoute({
  endpoint: routeDefinitions.errors.topErroneousTransactions.endpoint,
  params: routeDefinitions.errors.topErroneousTransactions.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
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
