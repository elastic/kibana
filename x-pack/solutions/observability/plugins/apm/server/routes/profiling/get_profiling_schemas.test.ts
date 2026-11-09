/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { getHostsProfilingEventsQuery, getTransactionsProfilingQuery } from './profiling_queries';
import { getProfilingHostsSchemas, getProfilingSchemas } from './get_profiling_schemas';

describe('APM profiling schemas with data', () => {
  const availability = { schemas: [ProfilingSchema.OTEL] };
  const getAvailableSchemas = jest.fn().mockResolvedValue(availability);
  const getAvailableSchemasByStacktraceIds = jest.fn().mockResolvedValue(availability);
  const profilingDataAccessStart = {
    services: { getAvailableSchemas, getAvailableSchemasByStacktraceIds },
  } as unknown as ProfilingDataAccessPluginStart;
  const esClient = {} as ElasticsearchClient;
  const range = { start: 1000, end: 1900 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfilingSchemas', () => {
    it('looks up the stacktrace IDs of the transactions the profiling data is correlated with', async () => {
      const filters = {
        kuery: 'transaction.result : "HTTP 2xx"',
        serviceName: 'my-service',
        transactionName: 'GET /orders',
        environment: 'production',
        transactionType: 'request',
      };

      await expect(
        getProfilingSchemas({
          profilingDataAccessStart,
          esClient,
          ...range,
          ...filters,
          indices: ['traces-apm*'],
          stacktraceIdsField: 'transaction.profiler_stack_trace_ids',
        })
      ).resolves.toBe(availability);

      expect(getAvailableSchemasByStacktraceIds).toHaveBeenCalledWith({
        esClient,
        indices: ['traces-apm*'],
        stacktraceIdsField: 'transaction.profiler_stack_trace_ids',
        query: getTransactionsProfilingQuery({ ...range, ...filters }),
      });
    });
  });

  describe('getProfilingHostsSchemas', () => {
    it('checks the profiling data of the containers of the service', async () => {
      await getProfilingHostsSchemas({
        profilingDataAccessStart,
        esClient,
        ...range,
        kuery: 'process.thread.name : "main"',
        hostNames: ['host-1'],
        containerIds: ['container-1'],
      });

      expect(getAvailableSchemas).toHaveBeenCalledWith({
        esClient,
        query: getHostsProfilingEventsQuery({
          ...range,
          kuery: 'process.thread.name : "main"',
          hostNames: ['host-1'],
          containerIds: ['container-1'],
        }),
      });
    });

    it('checks the profiling data of the hosts of the service when it has no containers', async () => {
      await getProfilingHostsSchemas({
        profilingDataAccessStart,
        esClient,
        ...range,
        kuery: '',
        hostNames: ['host-1', 'host-2'],
        containerIds: [],
      });

      expect(getAvailableSchemas).toHaveBeenCalledWith({
        esClient,
        query: getHostsProfilingEventsQuery({
          ...range,
          kuery: '',
          hostNames: ['host-1', 'host-2'],
          containerIds: [],
        }),
      });
    });

    it('reports no schema with data when the service has no hosts or containers', async () => {
      await expect(
        getProfilingHostsSchemas({
          profilingDataAccessStart,
          esClient,
          ...range,
          kuery: '',
          hostNames: [],
          containerIds: [],
        })
      ).resolves.toEqual({ schemas: [] });

      expect(getAvailableSchemas).not.toHaveBeenCalled();
    });
  });
});
