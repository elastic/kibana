/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { ProfilingSchemasAvailability } from '@kbn/profiling-utils';
import { getHostsProfilingEventsQuery, getTransactionsProfilingQuery } from './profiling_queries';

interface CommonParams {
  profilingDataAccessStart: ProfilingDataAccessPluginStart;
  esClient: ElasticsearchClient;
  /** In seconds */
  start: number;
  /** In seconds */
  end: number;
  kuery: string;
  abortSignal?: AbortSignal;
}

/**
 * Schemas with profiling data for transactions, which reference the profiling stacktraces sampled
 * while they ran, like the flamegraph and functions of the service profiling routes.
 */
export function getProfilingSchemas({
  profilingDataAccessStart,
  esClient,
  start,
  end,
  kuery,
  serviceName,
  transactionName,
  environment,
  transactionType,
  indices,
  stacktraceIdsField,
  abortSignal,
}: CommonParams & {
  serviceName: string;
  transactionName?: string;
  environment: string;
  transactionType: string;
  indices: string[];
  stacktraceIdsField: string;
}): Promise<ProfilingSchemasAvailability> {
  return profilingDataAccessStart.services.getAvailableSchemasByStacktraceIds({
    esClient,
    indices,
    stacktraceIdsField,
    query: getTransactionsProfilingQuery({
      start,
      end,
      kuery,
      serviceName,
      transactionName,
      environment,
      transactionType,
    }),
    abortSignal,
  });
}

/**
 * Schemas with profiling data for the hosts or containers of a service, like the flamegraph and
 * functions of the hosts profiling routes.
 */
export async function getProfilingHostsSchemas({
  profilingDataAccessStart,
  esClient,
  start,
  end,
  kuery,
  hostNames,
  containerIds,
  abortSignal,
}: CommonParams & {
  hostNames: string[];
  containerIds: string[];
}): Promise<ProfilingSchemasAvailability> {
  if (!hostNames.length && !containerIds.length) {
    return { schemas: [] };
  }

  return profilingDataAccessStart.services.getAvailableSchemas({
    esClient,
    query: getHostsProfilingEventsQuery({ start, end, kuery, hostNames, containerIds }),
    abortSignal,
  });
}
