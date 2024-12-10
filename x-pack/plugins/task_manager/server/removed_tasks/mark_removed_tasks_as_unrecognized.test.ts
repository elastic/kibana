/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockLogger } from '../test_utils';
import { coreMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SCHEDULE_INTERVAL, taskRunner } from './mark_removed_tasks_as_unrecognized';
import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

const createTaskDoc = (id: string = '1'): SearchHit<unknown> => ({
  _index: '.kibana_task_manager_9.0.0_001',
  _id: `task:${id}`,
  _score: 1,
  _source: {
    references: [],
    type: 'task',
    updated_at: '2024-11-06T14:17:55.935Z',
    task: {
      taskType: 'report',
      params: '{}',
      state: '{"foo":"test"}',
      stateVersion: 1,
      runAt: '2024-11-06T14:17:55.935Z',
      enabled: true,
      scheduledAt: '2024-11-06T14:17:55.935Z',
      attempts: 0,
      status: 'idle',
      startedAt: null,
      retryAt: null,
      ownerId: null,
      partition: 211,
    },
  },
});

describe('markRemovedTasksAsUnrecognizedTask', () => {
  const logger = mockLogger();
  const coreSetup = coreMock.createSetup();
  const esClient = elasticsearchServiceMock.createStart();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('marks removed tasks as unrecognized', async () => {
    esClient.client.asInternalUser.bulk.mockResolvedValue({
      errors: false,
      took: 0,
      items: [
        {
          update: {
            _index: '.kibana_task_manager_9.0.0_001',
            _id: 'task:123',
            _version: 2,
            result: 'updated',
            _shards: { total: 1, successful: 1, failed: 0 },
            _seq_no: 84,
            _primary_term: 1,
            status: 200,
          },
        },
        {
          update: {
            _index: '.kibana_task_manager_9.0.0_001',
            _id: 'task:456',
            _version: 2,
            result: 'updated',
            _shards: { total: 1, successful: 1, failed: 0 },
            _seq_no: 84,
            _primary_term: 1,
            status: 200,
          },
        },
        {
          update: {
            _index: '.kibana_task_manager_9.0.0_001',
            _id: 'task:789',
            _version: 2,
            result: 'updated',
            _shards: { total: 1, successful: 1, failed: 0 },
            _seq_no: 84,
            _primary_term: 1,
            status: 200,
          },
        },
      ],
    });

    coreSetup.getStartServices.mockResolvedValue([
      {
        ...coreMock.createStart(),
        elasticsearch: esClient,
      },
      {},
      coreMock.createSetup(),
    ]);
    // @ts-expect-error
    esClient.client.asInternalUser.search.mockResponse({
      hits: { hits: [createTaskDoc('123'), createTaskDoc('456'), createTaskDoc('789')], total: 3 },
    });

    const runner = taskRunner(logger, coreSetup.getStartServices)();
    const result = await runner.run();

    expect(esClient.client.asInternalUser.bulk).toHaveBeenCalledWith({
      body: [
        { update: { _id: 'task:123' } },
        { doc: { task: { status: 'unrecognized' } } },
        { update: { _id: 'task:456' } },
        { doc: { task: { status: 'unrecognized' } } },
        { update: { _id: 'task:789' } },
        { doc: { task: { status: 'unrecognized' } } },
      ],
      index: '.kibana_task_manager',
      refresh: false,
    });

    expect(logger.debug).toHaveBeenCalledWith(`Marked 3 removed tasks as unrecognized`);

    expect(result).toEqual({
      state: {},
      schedule: { interval: SCHEDULE_INTERVAL },
    });
  });

  it('skips update when there are no removed task types', async () => {
    coreSetup.getStartServices.mockResolvedValue([
      {
        ...coreMock.createStart(),
        elasticsearch: esClient,
      },
      {},
      coreMock.createSetup(),
    ]);
    // @ts-expect-error
    esClient.client.asInternalUser.search.mockResponse({
      hits: { hits: [], total: 0 },
    });

    const runner = taskRunner(logger, coreSetup.getStartServices)();
    const result = await runner.run();

    expect(esClient.client.asInternalUser.bulk).not.toHaveBeenCalled();

    expect(result).toEqual({
      state: {},
      schedule: { interval: SCHEDULE_INTERVAL },
    });
  });

  it('schedules the next run even when there is an error', async () => {
    coreSetup.getStartServices.mockResolvedValue([
      {
        ...coreMock.createStart(),
        elasticsearch: esClient,
      },
      {},
      coreMock.createSetup(),
    ]);
    esClient.client.asInternalUser.search.mockRejectedValueOnce(new Error('foo'));

    const runner = taskRunner(logger, coreSetup.getStartServices)();
    const result = await runner.run();

    expect(esClient.client.asInternalUser.bulk).not.toHaveBeenCalled();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to mark removed tasks as unrecognized. Error: foo'
    );

    expect(result).toEqual({
      state: {},
      schedule: { interval: SCHEDULE_INTERVAL },
    });
  });

  it('handles partial errors from bulk partial update', async () => {
    esClient.client.asInternalUser.bulk.mockResolvedValue({
      errors: false,
      took: 0,
      items: [
        {
          update: {
            _index: '.kibana_task_manager_9.0.0_001',
            _id: 'task:123',
            _version: 2,
            result: 'updated',
            _shards: { total: 1, successful: 1, failed: 0 },
            _seq_no: 84,
            _primary_term: 1,
            status: 200,
          },
        },
        {
          update: {
            _index: '.kibana_task_manager_9.0.0_001',
            _id: 'task:456',
            _version: 2,
            result: 'updated',
            _shards: { total: 1, successful: 1, failed: 0 },
            _seq_no: 84,
            _primary_term: 1,
            status: 200,
          },
        },
        {
          update: {
            _index: '.kibana_task_manager_9.0.0_001',
            _id: 'task:789',
            _version: 2,
            error: {
              type: 'document_missing_exception',
              reason: '[5]: document missing',
              index_uuid: 'aAsFqTI0Tc2W0LCWgPNrOA',
              shard: '0',
              index: '.kibana_task_manager_9.0.0_001',
            },
            status: 404,
          },
        },
      ],
    });

    coreSetup.getStartServices.mockResolvedValue([
      {
        ...coreMock.createStart(),
        elasticsearch: esClient,
      },
      {},
      coreMock.createSetup(),
    ]);
    // @ts-expect-error
    esClient.client.asInternalUser.search.mockResponse({
      hits: { hits: [createTaskDoc('123'), createTaskDoc('456'), createTaskDoc('789')], total: 3 },
    });

    const runner = taskRunner(logger, coreSetup.getStartServices)();
    const result = await runner.run();

    expect(esClient.client.asInternalUser.bulk).toHaveBeenCalledWith({
      body: [
        { update: { _id: 'task:123' } },
        { doc: { task: { status: 'unrecognized' } } },
        { update: { _id: 'task:456' } },
        { doc: { task: { status: 'unrecognized' } } },
        { update: { _id: 'task:789' } },
        { doc: { task: { status: 'unrecognized' } } },
      ],
      index: '.kibana_task_manager',
      refresh: false,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      `Error updating task task:789 to mark as unrecognized - {\"type\":\"document_missing_exception\",\"reason\":\"[5]: document missing\",\"index_uuid\":\"aAsFqTI0Tc2W0LCWgPNrOA\",\"shard\":\"0\",\"index\":\".kibana_task_manager_9.0.0_001\"}`
    );

    expect(logger.debug).toHaveBeenCalledWith(`Marked 2 removed tasks as unrecognized`);

    expect(result).toEqual({
      state: {},
      schedule: { interval: SCHEDULE_INTERVAL },
    });
  });
});
