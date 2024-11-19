/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockLogger } from '../test_utils';
import {
  coreMock,
  savedObjectsRepositoryMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { CLEANUP_INTERVAL, taskRunner } from './delete_inactive_nodes_task';
import { BackgroundTaskNode } from '../saved_objects/schemas/background_task_node';
import {
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { BACKGROUND_TASK_NODE_SO_NAME } from '../saved_objects';

const currentNode = 'current-node-id';
const now = '2024-08-10T10:00:00.000Z';

const createNodeRecord = (id: string = '1', lastSeen: string = now): BackgroundTaskNode => ({
  id,
  last_seen: lastSeen,
});

const createFindSO = (
  id: string = currentNode,
  lastSeen: string = now
): SavedObjectsFindResult<BackgroundTaskNode> => ({
  attributes: createNodeRecord(id, lastSeen),
  id: `${BACKGROUND_TASK_NODE_SO_NAME}:${id}`,
  namespaces: ['default'],
  references: [],
  score: 1,
  type: BACKGROUND_TASK_NODE_SO_NAME,
  updated_at: new Date().toDateString(),
  version: '1',
});

const createFindResponse = (
  soList: Array<SavedObjectsFindResult<BackgroundTaskNode>>
): SavedObjectsFindResponse<BackgroundTaskNode, unknown> => ({
  total: 1,
  per_page: 100,
  page: 1,
  saved_objects: soList,
});

describe('Delete inactive background task nodes', () => {
  const logger = mockLogger();
  const coreSetup = coreMock.createSetup();

  const savedObjectsRepository = savedObjectsRepositoryMock.create();

  coreSetup.getStartServices.mockResolvedValue([
    {
      ...coreMock.createStart(),
      savedObjects: {
        ...savedObjectsServiceMock.createStartContract(),
        createInternalRepository: () => savedObjectsRepository,
      },
    },
    coreMock.createSetup(),
    {},
  ]);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the inactive nodes', async () => {
    savedObjectsRepository.find.mockResolvedValue(
      createFindResponse([
        createFindSO('123', '10.10.2024'),
        createFindSO('456', '10.10.2024'),
        createFindSO('789', '10.10.2024'),
      ])
    );

    const runner = taskRunner(logger, coreSetup.getStartServices)();
    const result = await runner.run();

    expect(savedObjectsRepository.bulkDelete).toHaveBeenCalledWith(
      [
        { id: '123', type: 'background-task-node' },
        { id: '456', type: 'background-task-node' },
        { id: '789', type: 'background-task-node' },
      ],
      { force: true, refresh: false }
    );

    expect(logger.debug).toHaveBeenCalledWith(
      'Inactive Kibana nodes: 123,456,789, have been successfully deleted'
    );

    expect(result).toEqual({
      state: {},
      schedule: {
        interval: CLEANUP_INTERVAL,
      },
    });
  });

  it("skips delete when there isn't any inactive node", async () => {
    savedObjectsRepository.find.mockResolvedValue(createFindResponse([]));

    const runner = taskRunner(logger, coreSetup.getStartServices)();
    const result = await runner.run();

    expect(savedObjectsRepository.bulkDelete).not.toHaveBeenCalled();

    expect(logger.info).not.toHaveBeenCalled();

    expect(result).toEqual({
      state: {},
      schedule: {
        interval: CLEANUP_INTERVAL,
      },
    });
  });

  it('schedules the next run even when there is an error', async () => {
    savedObjectsRepository.find.mockRejectedValueOnce(new Error('foo'));

    const runner = taskRunner(logger, coreSetup.getStartServices)();
    const result = await runner.run();

    expect(savedObjectsRepository.bulkDelete).not.toHaveBeenCalled();

    expect(logger.error).toHaveBeenCalledWith('Deleting inactive nodes failed. Error: foo ');

    expect(result).toEqual({
      state: {},
      schedule: {
        interval: CLEANUP_INTERVAL,
      },
    });
  });
});
