/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsFindResponse, SavedObjectsFindResult } from '@kbn/core/server';
import { BackgroundTaskNode } from '../saved_objects/schemas/background_task_node';
import { BACKGROUND_TASK_NODE_SO_NAME } from '../saved_objects';
import { KibanaDiscoveryService } from './kibana_discovery_service';

export const createDiscoveryServiceMock = (currentNode: string) => {
  const savedObjectsRepository = savedObjectsRepositoryMock.create();
  const logger = loggingSystemMock.createLogger();
  const discoveryService = new KibanaDiscoveryService({
    savedObjectsRepository,
    logger,
    currentNode,
  });

  for (const method of ['getActiveKibanaNodes'] as Array<keyof KibanaDiscoveryService>) {
    jest.spyOn(discoveryService, method);
  }

  return discoveryService as jest.Mocked<KibanaDiscoveryService>;
};

export const createNodeRecord = (id: string, lastSeen: string): BackgroundTaskNode => ({
  id,
  last_seen: lastSeen,
});

export const createFindSO = (
  id: string,
  lastSeen: string
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

export const createFindResponse = (
  soList: Array<SavedObjectsFindResult<BackgroundTaskNode>>
): SavedObjectsFindResponse<BackgroundTaskNode, unknown> => ({
  total: 1,
  per_page: 10000,
  page: 1,
  saved_objects: soList,
});
