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
  const params = {
    profilingDataAccessStart,
    core: {} as CoreRequestHandlerContext,
    esClient: {} as ElasticsearchClient,
    start: 1000,
    end: 2000,
    kuery: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    ['the requested schema', ProfilingSchema.OTEL],
    ['no schema, so the default of the profiling APIs applies', undefined],
  ])('with %s', (_description, schema) => {
    it('passes the schema on to the flamegraph request', async () => {
      await fetchFlamegraph({ ...params, schema });

      expect(fetchFlamechartData).toHaveBeenCalledWith(expect.objectContaining({ schema }));
    });

    it('passes the schema on to the functions request', async () => {
      await fetchFunctions({ ...params, startIndex: 0, endIndex: 10, schema });

      expect(fetchFunctionsService).toHaveBeenCalledWith(expect.objectContaining({ schema }));
    });
  });
});
