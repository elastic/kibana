/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { KibanaDiscoveryService } from './kibana_discovery_service';
import { BACKGROUND_TASK_NODE_SO_NAME } from '../saved_objects';
import { SavedObjectsBulkDeleteResponse, SavedObjectsUpdateResponse } from '@kbn/core/server';

import { createFindResponse, createFindSO } from './mock_kibana_discovery_service';
import { DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION, DEFAULT_DISCOVERY_INTERVAL_MS } from '../config';

const currentNode = 'current-node-id';
const now = '2024-08-10T10:00:00.000Z';

describe('KibanaDiscoveryService', () => {
  const savedObjectsRepository = savedObjectsRepositoryMock.create();
  const logger = loggingSystemMock.createLogger();

  savedObjectsRepository.find.mockResolvedValue(createFindResponse([]));
  savedObjectsRepository.update.mockResolvedValue({} as SavedObjectsUpdateResponse<unknown>);
  savedObjectsRepository.bulkDelete.mockResolvedValue({} as SavedObjectsBulkDeleteResponse);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'clearTimeout');
    jest.setSystemTime(new Date(now));
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
        config: {
          active_nodes_lookback: DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION,
          interval: DEFAULT_DISCOVERY_INTERVAL_MS,
        },
      });
      await kibanaDiscoveryService.start();

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsRepository.update).toHaveBeenCalledWith(
        BACKGROUND_TASK_NODE_SO_NAME,
        currentNode,
        { id: 'current-node-id', last_seen: '2024-08-10T10:00:00.000Z' },
        { upsert: { id: 'current-node-id', last_seen: '2024-08-10T10:00:00.000Z' }, refresh: false }
      );
      expect(savedObjectsRepository.find).not.toHaveBeenCalled();
      expect(savedObjectsRepository.bulkDelete).not.toHaveBeenCalled();

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Kibana Discovery Service has been started');
      expect(kibanaDiscoveryService.isStarted()).toBe(true);
    });

    it('does not start multiple times', async () => {
      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
        config: {
          active_nodes_lookback: DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION,
          interval: DEFAULT_DISCOVERY_INTERVAL_MS,
        },
      });
      await kibanaDiscoveryService.start();
      await kibanaDiscoveryService.start();

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
        config: {
          active_nodes_lookback: DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION,
          interval: DEFAULT_DISCOVERY_INTERVAL_MS,
        },
      });
      await kibanaDiscoveryService.start();

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);

      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        DEFAULT_DISCOVERY_INTERVAL_MS
      );

      jest.runOnlyPendingTimers();

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(2);
    });

    it('reschedules when upsert fails on start', async () => {
      savedObjectsRepository.update.mockRejectedValueOnce(new Error('foo'));

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
        config: {
          active_nodes_lookback: DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION,
          interval: DEFAULT_DISCOVERY_INTERVAL_MS,
        },
      });
      await kibanaDiscoveryService.start();

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "Kibana Discovery Service couldn't be started and will be retried in 10000ms, error:foo"
      );
      expect(logger.info).not.toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        DEFAULT_DISCOVERY_INTERVAL_MS
      );
    });

    it('reschedules when upsert fails after start', async () => {
      savedObjectsRepository.update.mockResolvedValueOnce(
        {} as SavedObjectsUpdateResponse<unknown>
      );

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
        config: {
          active_nodes_lookback: DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION,
          interval: DEFAULT_DISCOVERY_INTERVAL_MS,
        },
      });
      await kibanaDiscoveryService.start();

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Kibana Discovery Service has been started');
      expect(kibanaDiscoveryService.isStarted()).toBe(true);
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        DEFAULT_DISCOVERY_INTERVAL_MS
      );

      savedObjectsRepository.update.mockRejectedValueOnce(new Error('foo'));

      await jest.advanceTimersByTimeAsync(15000);

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenNthCalledWith(
        2,
        expect.any(Function),
        DEFAULT_DISCOVERY_INTERVAL_MS
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "Kibana Discovery Service couldn't update this node's last_seen timestamp. id: current-node-id, last_seen: 2024-08-10T10:00:10.000Z, error:foo"
      );
    });

    it('does not schedule when Kibana is shutting down', async () => {
      savedObjectsRepository.update.mockResolvedValueOnce(
        {} as SavedObjectsUpdateResponse<unknown>
      );

      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
        config: {
          active_nodes_lookback: DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION,
          interval: DEFAULT_DISCOVERY_INTERVAL_MS,
        },
      });
      await kibanaDiscoveryService.start();

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Kibana Discovery Service has been started');
      expect(kibanaDiscoveryService.isStarted()).toBe(true);
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        DEFAULT_DISCOVERY_INTERVAL_MS
      );

      kibanaDiscoveryService.stop();

      await jest.advanceTimersByTimeAsync(15000);

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        DEFAULT_DISCOVERY_INTERVAL_MS
      );
      expect(clearTimeout).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActiveKibanaNodes', () => {
    const mockActiveNodes = [createFindSO('456', '10.10.2024')];
    savedObjectsRepository.find.mockResolvedValueOnce(createFindResponse(mockActiveNodes));

    it('returns the active kibana nodes', async () => {
      const kibanaDiscoveryService = new KibanaDiscoveryService({
        savedObjectsRepository,
        logger,
        currentNode,
        config: {
          active_nodes_lookback: DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION,
          interval: DEFAULT_DISCOVERY_INTERVAL_MS,
        },
      });

      const activeNodes = await kibanaDiscoveryService.getActiveKibanaNodes();

      expect(savedObjectsRepository.find).toHaveBeenCalledWith({
        filter: `${BACKGROUND_TASK_NODE_SO_NAME}.attributes.last_seen > now-${DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION}`,
        page: 1,
        perPage: 10000,
        type: BACKGROUND_TASK_NODE_SO_NAME,
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
        config: {
          active_nodes_lookback: DEFAULT_ACTIVE_NODES_LOOK_BACK_DURATION,
          interval: DEFAULT_DISCOVERY_INTERVAL_MS,
        },
      });

      await kibanaDiscoveryService.deleteCurrentNode();

      expect(savedObjectsRepository.delete).toHaveBeenCalledWith(
        BACKGROUND_TASK_NODE_SO_NAME,
        'current-node-id'
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Removed this node from the Kibana Discovery Service'
      );
    });
  });
});
