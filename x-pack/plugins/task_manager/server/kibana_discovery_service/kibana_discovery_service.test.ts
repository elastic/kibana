/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { KibanaDiscoveryService } from './kibana_discovery_service';
import { BACKGROUND_TASK_NODE_SO_NAME } from '../saved_objects';
import {
  SavedObjectsBulkDeleteResponse,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import { BackgroundTaskNode } from '../saved_objects/schemas/background_task_node';

const currentNode = 'current-node-id';
const now = '2024-08-10T10:00:00.000Z';

const createNodeRecord = (
  id: string = '1',
  lastSeen: string = '2024-08-10T10:00:00.000Z'
): BackgroundTaskNode => ({
  id,
  last_seen: lastSeen,
});

const createFindSO = (
  id: string = currentNode,
  lastSeen: string = now
): SavedObjectsFindResult<BackgroundTaskNode> => ({
  attributes: createNodeRecord(id, lastSeen),
  id: `background_task_node:${id}`,
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
  per_page: 10000,
  page: 1,
  saved_objects: soList,
});

describe('KibanaDiscoveryService', () => {
  const savedObjectsRepository = savedObjectsRepositoryMock.create();
  const logger = loggingSystemMock.createLogger();

  savedObjectsRepository.find.mockResolvedValue(createFindResponse([createFindSO()]));
  savedObjectsRepository.update.mockResolvedValue({} as SavedObjectsUpdateResponse<unknown>);
  savedObjectsRepository.bulkDelete.mockResolvedValue({} as SavedObjectsBulkDeleteResponse);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    jest.setSystemTime(new Date(2024, 7, 10, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('starts successfully', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce(createFindResponse([]));

    const kibanaDiscoveryService = new KibanaDiscoveryService({
      savedObjectsRepository,
      logger,
      currentNode,
    });
    await kibanaDiscoveryService.start();

    expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepository.update).toHaveBeenCalledWith(
      BACKGROUND_TASK_NODE_SO_NAME,
      currentNode,
      { id: 'current-node-id', last_seen: '2024-08-10T10:00:00.000Z' },
      { upsert: { id: 'current-node-id', last_seen: '2024-08-10T10:00:00.000Z' } }
    );
    expect(savedObjectsRepository.find).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepository.find).toHaveBeenCalledWith({
      filter: 'background_task_node.attributes.last_seen < now-5m',
      page: 1,
      perPage: 10000,
      type: 'background_task_node',
    });
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Kibana Discovery Service has been initialized');
    expect(kibanaDiscoveryService.isStarted()).toBe(true);
  });

  it('does not start multiple times', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce(createFindResponse([]));
    const kibanaDiscoveryService = new KibanaDiscoveryService({
      savedObjectsRepository,
      logger,
      currentNode,
    });
    await kibanaDiscoveryService.start();
    await kibanaDiscoveryService.start();

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Kibana Discovery Service has been initialized');
    expect(logger.warn).toHaveBeenCalledWith(
      'Kibana Discovery Service has already been initialized'
    );
  });

  it('schedules node record refresh job and delete inactive nodes job', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce(createFindResponse([]));
    const kibanaDiscoveryService = new KibanaDiscoveryService({
      savedObjectsRepository,
      logger,
      currentNode,
    });
    await kibanaDiscoveryService.start();

    expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepository.find).toHaveBeenCalledTimes(1);

    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 10000);
    expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 60000);

    jest.runOnlyPendingTimers();

    expect(savedObjectsRepository.update).toHaveBeenCalledTimes(2);
    expect(savedObjectsRepository.find).toHaveBeenCalledTimes(2);
  });

  it('deletes inactive nodes', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce(createFindResponse([createFindSO('123')]));
    const kibanaDiscoveryService = new KibanaDiscoveryService({
      savedObjectsRepository,
      logger,
      currentNode,
    });
    await kibanaDiscoveryService.start();

    expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepository.find).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepository.bulkDelete).toHaveBeenCalledTimes(1);

    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      'Inactive Kibana nodes: 123, have been successfully deleted'
    );
  });
});
