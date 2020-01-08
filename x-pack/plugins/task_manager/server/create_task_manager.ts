/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IClusterClient,
  SavedObjectsSerializer,
  SavedObjectsSchema,
  CoreSetup,
  ISavedObjectsRepository,
} from '../../../../src/core/server';
import { TaskManager } from './task_manager';
import { Logger } from './types';

export interface LegacyDeps {
  config: any;
  savedObjectSchemas: any;
  elasticsearch: Pick<IClusterClient, 'callAsInternalUser'>;
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
}

export function createTaskManager(
  core: CoreSetup,
  {
    logger,
    config,
    savedObjectSchemas,
    elasticsearch: { callAsInternalUser },
    savedObjectsRepository,
  }: LegacyDeps
) {
  // as we use this Schema solely to interact with Tasks, we
  // can initialise it with solely the Tasks schema
  const serializer = new SavedObjectsSerializer(new SavedObjectsSchema(savedObjectSchemas));
  return new TaskManager({
    taskManagerId: core.uuid.getInstanceUuid(),
    config,
    savedObjectsRepository,
    serializer,
    callAsInternalUser,
    logger,
  });
}
