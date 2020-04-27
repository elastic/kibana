/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IClusterClient,
  SavedObjectsSerializer,
  CoreSetup,
  ISavedObjectsRepository,
} from '../../../../src/core/server';
import { TaskManager } from './task_manager';
import { Logger } from './types';
import { TaskManagerConfig } from './config';

export interface LegacyDeps {
  config: unknown;
  elasticsearch: Pick<IClusterClient, 'callAsInternalUser'>;
  savedObjectsRepository: ISavedObjectsRepository;
  savedObjectsSerializer: SavedObjectsSerializer;
  logger: Logger;
}

export function createTaskManager(
  core: CoreSetup,
  {
    logger,
    config,
    elasticsearch: { callAsInternalUser },
    savedObjectsRepository,
    savedObjectsSerializer,
  }: LegacyDeps
) {
  return new TaskManager({
    taskManagerId: core.uuid.getInstanceUuid(),
    config: config as TaskManagerConfig,
    savedObjectsRepository,
    serializer: savedObjectsSerializer,
    callAsInternalUser,
    logger,
  });
}
