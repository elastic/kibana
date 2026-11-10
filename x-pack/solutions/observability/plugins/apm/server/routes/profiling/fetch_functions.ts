/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { ProfilingSchema } from '@kbn/profiling-utils';

interface Params {
  profilingDataAccessStart: ProfilingDataAccessPluginStart;
  core: CoreRequestHandlerContext;
  esClient: ElasticsearchClient;
  startIndex: number;
  endIndex: number;
  totalSeconds: number;
  query: QueryDslQueryContainer;
  indices?: string[];
  stacktraceIdsField?: string;
  /** Universal Profiling (ECS) when undefined */
  schema: ProfilingSchema | undefined;
  abortSignal?: AbortSignal;
}

export function fetchFunctions({
  profilingDataAccessStart,
  core,
  esClient,
  startIndex,
  endIndex,
  totalSeconds,
  query,
  indices,
  stacktraceIdsField,
  schema,
  abortSignal,
}: Params) {
  return profilingDataAccessStart.services.fetchFunctions({
    core,
    esClient,
    startIndex,
    endIndex,
    totalSeconds,
    query,
    indices,
    stacktraceIdsField,
    schema,
    abortSignal,
  });
}
