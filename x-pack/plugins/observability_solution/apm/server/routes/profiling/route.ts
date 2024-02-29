/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochSecsRt, toNumberRt } from '@kbn/io-ts-utils';
import type { BaseFlameGraph, TopNFunctions } from '@kbn/profiling-utils';
import * as t from 'io-ts';
import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  HOST_NAME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_PROFILER_STACK_TRACE_IDS,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import {
  mergeKueries,
  toKueryFilterFormat,
} from '../../../common/utils/kuery_utils';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  environmentRt,
  kueryRt,
  rangeRt,
  serviceTransactionDataSourceRt,
} from '../default_api_types';
import { getServiceHostNames } from './get_service_host_names';
import { environmentQuery } from '../../../common/utils/environment_query';

const profilingFlamegraphRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      rangeRt,
      environmentRt,
      serviceTransactionDataSourceRt,
      kueryRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<
    { flamegraph: BaseFlameGraph; hostNames: string[] } | undefined
  > => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, apmEventClient, profilingDataAccessStart] =
      await Promise.all([
        core.elasticsearch.client,
        await getApmEventClient(resources),
        await plugins.profilingDataAccess?.start(),
      ]);
    if (profilingDataAccessStart) {
      const { start, end, environment, documentType, rollupInterval, kuery } =
        params.query;
      const { serviceName } = params.path;

      const serviceHostNames = await getServiceHostNames({
        apmEventClient,
        start,
        end,
        environment,
        serviceName,
        documentType,
        rollupInterval,
      });

      if (!serviceHostNames.length) {
        return undefined;
      }
      const startSecs = start / 1000;
      const endSecs = end / 1000;

      const flamegraph =
        await profilingDataAccessStart?.services.fetchFlamechartData({
          core,
          esClient: esClient.asCurrentUser,
          totalSeconds: endSecs - startSecs,
          query: {
            bool: {
              filter: [
                ...kqlQuery(
                  mergeKueries([
                    `(${toKueryFilterFormat(HOST_NAME, serviceHostNames)})`,
                    kuery,
                  ])
                ),
                {
                  range: {
                    ['@timestamp']: {
                      gte: String(startSecs),
                      lt: String(endSecs),
                      format: 'epoch_second',
                    },
                  },
                },
              ],
            },
          },
        });

      return { flamegraph, hostNames: serviceHostNames };
    }

    return undefined;
  },
});

const profilingFunctionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/functions',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      rangeRt,
      environmentRt,
      serviceTransactionDataSourceRt,
      t.type({ startIndex: toNumberRt, endIndex: toNumberRt }),
      kueryRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ functions: TopNFunctions; hostNames: string[] } | undefined> => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, apmEventClient, profilingDataAccessStart] =
      await Promise.all([
        core.elasticsearch.client,
        await getApmEventClient(resources),
        await plugins.profilingDataAccess?.start(),
      ]);
    if (profilingDataAccessStart) {
      const {
        start,
        end,
        environment,
        startIndex,
        endIndex,
        documentType,
        rollupInterval,
        kuery,
      } = params.query;
      const { serviceName } = params.path;

      const serviceHostNames = await getServiceHostNames({
        apmEventClient,
        start,
        end,
        environment,
        serviceName,
        documentType,
        rollupInterval,
      });

      if (!serviceHostNames.length) {
        return undefined;
      }

      const startSecs = start / 1000;
      const endSecs = end / 1000;

      const functions = await profilingDataAccessStart?.services.fetchFunction({
        core,
        esClient: esClient.asCurrentUser,
        startIndex,
        endIndex,
        totalSeconds: endSecs - startSecs,
        query: {
          bool: {
            filter: [
              ...kqlQuery(
                mergeKueries([
                  `(${toKueryFilterFormat(HOST_NAME, serviceHostNames)})`,
                  kuery,
                ])
              ),
              {
                range: {
                  ['@timestamp']: {
                    gte: String(startSecs),
                    lt: String(endSecs),
                    format: 'epoch_second',
                  },
                },
              },
            ],
          },
        },
      });
      return { functions, hostNames: serviceHostNames };
    }

    return undefined;
  },
});

const transactionsFlamegraphRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/flamegraph',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      kueryRt,
      environmentRt,
      t.type({
        transactionName: t.string,
        start: isoToEpochSecsRt,
        end: isoToEpochSecsRt,
        transactionType: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<BaseFlameGraph | undefined> => {
    const { context, plugins, params } = resources;
    const core = await context.core;
    const [esClient, profilingDataAccessStart, apmEventClient] =
      await Promise.all([
        core.elasticsearch.client,
        await plugins.profilingDataAccess?.start(),
        getApmEventClient(resources),
      ]);
    if (profilingDataAccessStart) {
      const { serviceName } = params.path;
      const {
        start,
        end,
        kuery,
        transactionName,
        transactionType,
        environment,
      } = params.query;

      const indices = apmEventClient.getIndicesFromProcessorEvent(
        ProcessorEvent.transaction
      );

      return await profilingDataAccessStart?.services.fetchFlamechartData({
        core,
        esClient: esClient.asCurrentUser,
        indices,
        stacktraceIdsField: TRANSACTION_PROFILER_STACK_TRACE_IDS,
        totalSeconds: end - start,
        query: {
          bool: {
            filter: [
              ...kqlQuery(kuery),
              ...termQuery(SERVICE_NAME, serviceName),
              ...termQuery(TRANSACTION_NAME, transactionName),
              ...environmentQuery(environment),
              ...termQuery(TRANSACTION_TYPE, transactionType),
              {
                range: {
                  ['@timestamp']: {
                    gte: String(start),
                    lt: String(end),
                    format: 'epoch_second',
                  },
                },
              },
            ],
          },
        },
      });
    }

    return undefined;
  },
});

const transactionsFunctionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/functions',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      environmentRt,
      t.type({
        start: isoToEpochSecsRt,
        end: isoToEpochSecsRt,
        startIndex: toNumberRt,
        endIndex: toNumberRt,
        transactionName: t.string,
        transactionType: t.string,
      }),
      kueryRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<TopNFunctions | undefined> => {
    const { context, plugins, params } = resources;
    const core = await context.core;

    const [esClient, profilingDataAccessStart, apmEventClient] =
      await Promise.all([
        core.elasticsearch.client,
        await plugins.profilingDataAccess?.start(),
        getApmEventClient(resources),
      ]);
    if (profilingDataAccessStart) {
      const {
        start,
        end,
        startIndex,
        endIndex,
        kuery,
        transactionName,
        transactionType,
        environment,
      } = params.query;
      const { serviceName } = params.path;

      const indices = apmEventClient.getIndicesFromProcessorEvent(
        ProcessorEvent.transaction
      );

      return profilingDataAccessStart?.services.fetchFunction({
        core,
        esClient: esClient.asCurrentUser,
        startIndex,
        endIndex,
        indices,
        stacktraceIdsField: TRANSACTION_PROFILER_STACK_TRACE_IDS,
        totalSeconds: end - start,
        query: {
          bool: {
            filter: [
              ...kqlQuery(kuery),
              ...termQuery(SERVICE_NAME, serviceName),
              ...termQuery(TRANSACTION_NAME, transactionName),
              ...environmentQuery(environment),
              ...termQuery(TRANSACTION_TYPE, transactionType),
              {
                range: {
                  ['@timestamp']: {
                    gte: String(start),
                    lt: String(end),
                    format: 'epoch_second',
                  },
                },
              },
            ],
          },
        },
      });
    }

    return undefined;
  },
});

const profilingStatusRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/profiling/status',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ initialized: boolean }> => {
    const { context, plugins, logger } = resources;
    const [esClient, profilingDataAccessStart] = await Promise.all([
      (await context.core).elasticsearch.client,
      await plugins.profilingDataAccess?.start(),
    ]);
    if (profilingDataAccessStart) {
      try {
        const response = await profilingDataAccessStart?.services.getStatus({
          esClient,
          soClient: (await context.core).savedObjects.client,
          spaceId: (
            await plugins.spaces?.start()
          )?.spacesService.getSpaceId(resources.request),
        });

        return { initialized: response.has_setup };
      } catch (e) {
        // If any error happens just return as if profiling has not been initialized
        logger.warn('Could not check Universal Profiling status');
      }
    }

    return { initialized: false };
  },
});

export const profilingRouteRepository = {
  ...profilingFlamegraphRoute,
  ...profilingStatusRoute,
  ...profilingFunctionsRoute,
  ...transactionsFlamegraphRoute,
  ...transactionsFunctionsRoute,
};
