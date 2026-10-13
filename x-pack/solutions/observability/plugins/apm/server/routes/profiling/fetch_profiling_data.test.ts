/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { fetchFlamegraph } from './fetch_flamegraph';
import { fetchFunctions } from './fetch_functions';

describe('APM profiling data fetchers', () => {
  const fetchFlamechartData = jest.fn();
  const fetchFunctionsService = jest.fn();
  const profilingDataAccessStart = {
    services: { fetchFlamechartData, fetchFunctions: fetchFunctionsService },
  } as unknown as ProfilingDataAccessPluginStart;
  const core = {} as CoreRequestHandlerContext;
  const esClient = {} as ElasticsearchClient;
  const query = { bool: { filter: [{ term: { 'service.name': 'my-service' } }] } };
  const correlation = {
    indices: ['traces-apm*'],
    stacktraceIdsField: 'transaction.profiler_stack_trace_ids',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    ['the requested schema', ProfilingSchema.OTEL],
    ['no schema, so the default of the profiling APIs applies', undefined],
  ])('with %s', (_description, schema) => {
    it('requests the flamegraph of the query', async () => {
      await fetchFlamegraph({
        profilingDataAccessStart,
        core,
        esClient,
        totalSeconds: 900,
        query,
        ...correlation,
        schema,
      });

      expect(fetchFlamechartData).toHaveBeenCalledWith({
        core,
        esClient,
        totalSeconds: 900,
        query,
        ...correlation,
        schema,
      });
    });

    it('requests the functions of the query', async () => {
      await fetchFunctions({
        profilingDataAccessStart,
        core,
        esClient,
        startIndex: 0,
        endIndex: 10,
        totalSeconds: 900,
        query,
        ...correlation,
        schema,
      });

      expect(fetchFunctionsService).toHaveBeenCalledWith({
        core,
        esClient,
        startIndex: 0,
        endIndex: 10,
        totalSeconds: 900,
        query,
        ...correlation,
        schema,
      });
    });
  });
});
