/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochSecsRt, toNumberRt } from '@kbn/io-ts-utils';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { BaseFlameGraph, TopNFunctions } from '@kbn/profiling-utils';
import * as t from 'io-ts';
import { TRANSACTION_PROFILER_STACK_TRACE_IDS } from '../../../../common/es_fields/apm';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt } from '../../default_api_types';
import { fetchFlamegraph } from '../fetch_flamegraph';
import { fetchFunctions } from '../fetch_functions';

const profilingTransactionsFlamegraphRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/profiling/transactions/flamegraph',
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

      return fetchFlamegraph({
        profilingDataAccessStart,
        core,
        esClient: esClient.asCurrentUser,
        start,
        end,
        kuery,
        serviceName,
        transactionName,
        environment,
        transactionType,
        indices,
        stacktraceIdsField: TRANSACTION_PROFILER_STACK_TRACE_IDS,
      });
    }

    return undefined;
  },
});

const profilingTransactionsFunctionsRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/profiling/transactions/functions',
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

      return fetchFunctions({
        profilingDataAccessStart,
        core,
        esClient: esClient.asCurrentUser,
        startIndex,
        endIndex,
        indices,
        stacktraceIdsField: TRANSACTION_PROFILER_STACK_TRACE_IDS,
        start,
        end,
        kuery,
        serviceName,
        transactionName,
        environment,
        transactionType,
      });
    }

    return undefined;
  },
});

export const profilingTransactionsRouteRepository = {
  ...profilingTransactionsFlamegraphRoute,
  ...profilingTransactionsFunctionsRoute,
};
