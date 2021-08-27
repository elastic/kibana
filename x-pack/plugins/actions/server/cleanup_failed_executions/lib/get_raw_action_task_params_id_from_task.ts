/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsSerializer } from '../../../../../../src/core/server/saved_objects/serialization/serializer';
import type { SavedObjectsFindResult } from '../../../../../../src/core/server/saved_objects/service/saved_objects_client';
import type { SpacesPluginStart } from '../../../../spaces/server/plugin';
import type { TaskInstance } from '../../../../task_manager/server/task';
import { spaceIdToNamespace } from '../../lib/space_id_to_namespace';

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
