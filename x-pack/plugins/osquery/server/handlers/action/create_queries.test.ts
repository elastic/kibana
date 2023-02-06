/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDynamicQueries, createQueries } from './create_queries';
import type { Ecs } from '@kbn/core/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

describe('create queries', () => {
  const defualtQueryParams = {
    interval: 3600,
    platform: 'linux',
    version: '1.0.0',
    ecs_mapping: {},
    removed: false,
    snapshot: true,
  };
  const mockedQueriesParams = {
    queries: [
      {
        query: 'SELECT * FROM processes where pid={{process.pid}};',
        id: 'process_with_params',
        ...defualtQueryParams,
      },
      {
        query: 'SELECT * FROM processes where pid={{process.not-existing}};',
        id: 'process_wrong_params',
        ...defualtQueryParams,
      },
      {
        query: 'SELECT * FROM processes;',
        id: 'process_no_params',
        ...defualtQueryParams,
      },
    ],
    agent_ids: ['929be3ee-13ee-4219-bcc2-5aa1593e8193'],
    alert_ids: ['72ae3004b99b747e26c81ae7e4bd978677ec5973234674fef6e4993fa54c9acc'],
  };
  const mockedSingleQueryParams = {
    query: 'SELECT * FROM processes where pid={{process.pid}};',
    interval: 3600,
    id: 'process_with_params',
    platform: 'linux',
  };

  // Info: getting queries by index (eg. [1], [0]) because can't compare whole query object due to unique action_id generated.
  describe('dynamic', () => {
    const pid = 123;
    it('if queries length it should return replaced list of queries', async () => {
      const queries = await createDynamicQueries(
        mockedQueriesParams,
        {
          process: {
            pid,
          },
        } as Ecs,
        {} as OsqueryAppContext
      );
      expect(queries[0].query).toBe(`SELECT * FROM processes where pid=${pid};`);
      expect(queries[1].error).toBe(
        "This query hasn't been called due to parameter used and its value not found in the alert."
      );
      expect(queries[1].query).toBe('SELECT * FROM processes where pid={{process.not-existing}};');
      expect(queries[2].query).toBe('SELECT * FROM processes;');
    });
    it('if single query it should return one replaced query ', async () => {
      const queries = await createDynamicQueries(
        mockedSingleQueryParams,
        {
          process: {
            pid,
          },
        } as Ecs,
        {} as OsqueryAppContext
      );
      expect(queries[0].query).toBe(`SELECT * FROM processes where pid=${pid};`);
    });
    it('if single query with not existing parameter it should return query as it is', async () => {
      const queries = await createDynamicQueries(
        mockedSingleQueryParams,
        {
          process: {},
        } as Ecs,
        {} as OsqueryAppContext
      );
      expect(queries[0].query).toBe('SELECT * FROM processes where pid={{process.pid}};');
      expect(queries[0].error).toBe(undefined);
    });
  });
  describe('normal', () => {
    const TEST_AGENT = 'test-agent';
    it('if queries length it should return not replaced list of queries with agents', async () => {
      const queries = await createQueries(
        mockedQueriesParams,
        [TEST_AGENT],
        {} as OsqueryAppContext
      );
      expect(queries[0].query).toBe('SELECT * FROM processes where pid={{process.pid}};');
      expect(queries[0].agents).toContain(TEST_AGENT);
      expect(queries[2].query).toBe('SELECT * FROM processes;');
      expect(queries[2].agents).toContain(TEST_AGENT);
    });

    it('if single query should return not replaced query with agents', async () => {
      const queries = await createQueries(
        mockedSingleQueryParams,
        [TEST_AGENT],
        {} as OsqueryAppContext
      );
      expect(queries[0].query).toBe('SELECT * FROM processes where pid={{process.pid}};');
      expect(queries[0].agents).toContain(TEST_AGENT);
    });
  });
});
