/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  KibanaDiscoveryService,
  cleanupInterval,
  discoveryInterval,
} from './kibana_discovery_service';
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

  savedObjectsRepository.find.mockResolvedValue(createFindResponse([]));
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

  describe('Discovery', () => {
    it('starts successfully', async () => {
      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });
      await kibanaDiscoveryService.startDiscovery();

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsRepository.update).toHaveBeenCalledWith(
        BACKGROUND_TASK_NODE_SO_NAME,
        currentNode,
        { id: 'current-node-id', last_seen: '2024-08-10T10:00:00.000Z' },
        { upsert: { id: 'current-node-id', last_seen: '2024-08-10T10:00:00.000Z' }, refresh: true }
      );
      expect(savedObjectsRepository.find).not.toHaveBeenCalled();
      expect(savedObjectsRepository.bulkDelete).not.toHaveBeenCalled();

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Kibana Discovery Service has been started');
      expect(kibanaDiscoveryService.isDiscoveryStarted()).toBe(true);
    });

    it('does not start multiple times', async () => {
      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });
      await kibanaDiscoveryService.startDiscovery();
      await kibanaDiscoveryService.startDiscovery();

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('Kibana Discovery Service has been started');
      expect(logger.warn).toHaveBeenCalledWith('Kibana Discovery Service has already been started');
    });

    it('schedules discovery job', async () => {
      savedObjectsRepository.find.mockResolvedValueOnce(createFindResponse([]));
      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });
      await kibanaDiscoveryService.startDiscovery();

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);

      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), discoveryInterval);

      jest.runOnlyPendingTimers();

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(2);
    });

    it('reschedules when upsert fails on start', async () => {
      savedObjectsRepository.update.mockRejectedValueOnce(new Error('foo'));

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });
      await kibanaDiscoveryService.startDiscovery();

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "Kibana Discovery Service couldn't be started, error:foo"
      );
      expect(logger.info).not.toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), discoveryInterval);
    });

    it('reschedules when upsert fails after start', async () => {
      savedObjectsRepository.update.mockResolvedValueOnce(
        {} as SavedObjectsUpdateResponse<unknown>
      );

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });
      await kibanaDiscoveryService.startDiscovery();

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Kibana Discovery Service has been started');
      expect(kibanaDiscoveryService.isDiscoveryStarted()).toBe(true);
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), discoveryInterval);

      savedObjectsRepository.update.mockRejectedValueOnce(new Error('foo'));

      await jest.advanceTimersByTimeAsync(15000);

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), discoveryInterval);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "Background Task Node couldn't be updated. id: current-node-id, last_seen: 2024-08-10T10:00:10.000Z, error:foo"
      );
    });
  });

  describe('Cleanup', () => {
    it('starts successfully', async () => {
      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });
      await kibanaDiscoveryService.startCleanup();

      expect(savedObjectsRepository.find).toHaveBeenCalledTimes(1);
      expect(savedObjectsRepository.find).toHaveBeenCalledWith({
        filter: 'background_task_node.attributes.last_seen < now-5m',
        page: 1,
        perPage: 10000,
        type: 'background_task_node',
      });
      expect(savedObjectsRepository.bulkDelete).not.toHaveBeenCalled();

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Kibana Discovery Service - Cleanup - has been started'
      );
    });

    it('does not start multiple times', async () => {
      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });
      await kibanaDiscoveryService.startCleanup();
      await kibanaDiscoveryService.startCleanup();

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'Kibana Discovery Service - Cleanup - has been started'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Kibana Discovery Service - Cleanup - has already been started'
      );
    });

    it('schedules discovery job', async () => {
      savedObjectsRepository.find.mockResolvedValueOnce(createFindResponse([createFindSO('123')]));

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });
      await kibanaDiscoveryService.startCleanup();
      expect(savedObjectsRepository.find).toHaveBeenCalledTimes(1);
      expect(savedObjectsRepository.bulkDelete).toHaveBeenCalledTimes(1);

      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), cleanupInterval);

      jest.runOnlyPendingTimers();

      expect(savedObjectsRepository.find).toHaveBeenCalledTimes(2);
      expect(savedObjectsRepository.bulkDelete).toHaveBeenCalledTimes(1);
    });

    it('reschedules when bulkDelete fails on start', async () => {
      savedObjectsRepository.find.mockResolvedValueOnce(createFindResponse([createFindSO('123')]));
      savedObjectsRepository.bulkDelete.mockRejectedValueOnce(new Error('foo'));

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });
      await kibanaDiscoveryService.startCleanup();

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "Kibana Discovery Service - Cleanup - couldn't be started. Error: foo"
      );
      expect(logger.info).not.toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), cleanupInterval);
    });

    it('reschedules when bulkDelete fails after start', async () => {
      savedObjectsRepository.find.mockResolvedValue(createFindResponse([createFindSO('123')]));
      savedObjectsRepository.bulkDelete.mockResolvedValue({} as SavedObjectsBulkDeleteResponse);

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });
      await kibanaDiscoveryService.startCleanup();

      expect(savedObjectsRepository.bulkDelete).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Kibana Discovery Service - Cleanup - has been started'
      );

      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), cleanupInterval);

      savedObjectsRepository.bulkDelete.mockRejectedValueOnce(new Error('foo'));

      await jest.advanceTimersByTimeAsync(100000);

      expect(savedObjectsRepository.bulkDelete).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), cleanupInterval);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('Deleting inactive nodes failed. Error: foo ');
    });
  });

  describe('getActiveKibanaNodes', () => {
    it('returns the active kibana nodes', async () => {
      const mockActiveNodes = [createFindSO('456', '10.10.2024')];

      savedObjectsRepository.find.mockResolvedValueOnce(createFindResponse(mockActiveNodes));

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });

      const activeNodes = await kibanaDiscoveryService.getActiveKibanaNodes();

      expect(savedObjectsRepository.find).toHaveBeenCalledWith({
        filter: 'background_task_node.attributes.last_seen > now-30s',
        page: 1,
        perPage: 10000,
        type: 'background_task_node',
      });
      expect(activeNodes).toEqual(mockActiveNodes);
    });
  });

  describe('deleteCurrentNode', () => {
    it('deletes the current kibana node SO', async () => {
      savedObjectsRepository.delete.mockResolvedValueOnce(200);

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });

      await kibanaDiscoveryService.deleteCurrentNode();

      expect(savedObjectsRepository.delete).toHaveBeenCalledWith(
        'background_task_node',
        'current-node-id'
      );

      expect(logger.info).toHaveBeenCalledWith('Current node has been deleted');
    });

    it('logs an error when failed', async () => {
      savedObjectsRepository.delete.mockRejectedValue(new Error('bar'));

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
      });

      await kibanaDiscoveryService.deleteCurrentNode();

      expect(logger.error).toHaveBeenCalledWith(
        'Deleting current node has been failed. error: bar'
      );
    });
  });
});
