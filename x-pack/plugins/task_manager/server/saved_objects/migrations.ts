/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuidv5 from 'uuid/v5';
import { SavedObjectMigrationMap, SavedObjectUnsanitizedDoc } from '../../../../../src/core/server';
import { TaskInstance, TaskInstanceWithDeprecatedFields } from '../task';

// TODO: Use https://github.com/elastic/kibana/issues/107744 when it's available
function deterministicallyRegenerateObjectId(namespace: string, type: string, id: string) {
  return uuidv5(`${namespace}:${type}:${id}`, uuidv5.DNS); // the uuidv5 namespace constant (uuidv5.DNS) is arbitrary
}

export const migrations: SavedObjectMigrationMap = {
  '7.4.0': (doc) => ({
    ...doc,
    updated_at: new Date().toISOString(),
  }),
  '7.6.0': moveIntervalIntoSchedule,
  '8.0.0': migrationSavedObjectIds,
};

function migrationSavedObjectIds(doc: SavedObjectUnsanitizedDoc<TaskInstanceWithDeprecatedFields>) {
  if (doc.attributes.taskType.startsWith('alerting:')) {
    let params: { spaceId?: string; alertId?: string } = {};
    try {
      params = JSON.parse((doc.attributes.params as unknown) as string);
    } catch (err) {
      // Do nothing?
    }

    if (params.alertId && params.spaceId && params.spaceId !== 'default') {
      const newId = deterministicallyRegenerateObjectId(params.spaceId, 'alert', params.alertId);
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          params: JSON.stringify({
            ...params,
            alertId: newId,
          }),
        },
      };
    }
  }

  return doc;
}

function moveIntervalIntoSchedule({
  attributes: { interval, ...attributes },
  ...doc
}: SavedObjectUnsanitizedDoc<TaskInstanceWithDeprecatedFields>): SavedObjectUnsanitizedDoc<TaskInstance> {
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
