/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectMigrationMap, SavedObjectUnsanitizedDoc } from '../../../../../src/core/server';
import { TaskInstance, TaskInstanceWithDeprecatedFields } from '../task';

export const migrations: SavedObjectMigrationMap = {
  '7.4.0': (doc) => ({
    ...doc,
    updated_at: new Date().toISOString(),
  }),
  '7.6.0': moveIntervalIntoSchedule,
};

function moveIntervalIntoSchedule({
  attributes: { interval, ...attributes },
  ...doc
}: SavedObjectUnsanitizedDoc<TaskInstanceWithDeprecatedFields>): SavedObjectUnsanitizedDoc<
  TaskInstance
> {
  return {
    ...doc,
    attributes: {
      ...attributes,
      ...(interval
        ? {
            schedule: {
              interval,
            },
          }
        : {}),
    },
  };
}
