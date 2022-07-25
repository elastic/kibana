/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResult, SavedObjectsSerializer } from '@kbn/core/server';
import { TaskInstance } from '@kbn/task-manager-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { spaceIdToNamespace } from '../../lib';

interface GetRawActionTaskParamsIdFromTaskOpts {
  task: SavedObjectsFindResult<TaskInstance>;
  spaces?: SpacesPluginStart;
  savedObjectsSerializer: SavedObjectsSerializer;
}

export function getRawActionTaskParamsIdFromTask({
  task,
  spaces,
  savedObjectsSerializer,
}: GetRawActionTaskParamsIdFromTaskOpts) {
  const { spaceId, actionTaskParamsId } = task.attributes.params;
  const namespace = spaceIdToNamespace(spaces, spaceId);
  return savedObjectsSerializer.generateRawId(namespace, 'action_task_params', actionTaskParamsId);
}
