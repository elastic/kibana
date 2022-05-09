/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogMeta,
  SavedObjectMigrationContext,
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
  SavedObjectsUtils,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core/server';
import { REMOVED_TYPES } from '../task_type_dictionary';
import { ConcreteTaskInstance, TaskStatus } from '../task';

interface TaskInstanceLogMeta extends LogMeta {
  migrations: { taskInstanceDocument: SavedObjectUnsanitizedDoc<ConcreteTaskInstance> };
}

type TaskInstanceMigration = (
  doc: SavedObjectUnsanitizedDoc<ConcreteTaskInstance>
) => SavedObjectUnsanitizedDoc<ConcreteTaskInstance>;

export function getMigrations(): SavedObjectMigrationMap {
  return {
    '7.4.0': executeMigrationWithErrorHandling(
      (doc) => ({
        ...doc,
        updated_at: new Date().toISOString(),
      }),
      '7.4.0'
    ),
    '7.6.0': executeMigrationWithErrorHandling(moveIntervalIntoSchedule, '7.6.0'),
    '8.0.0': executeMigrationWithErrorHandling(
      pipeMigrations(alertingTaskLegacyIdToSavedObjectIds, actionsTasksLegacyIdToSavedObjectIds),
      '8.0.0'
    ),
    '8.2.0': executeMigrationWithErrorHandling(
      pipeMigrations(resetAttemptsAndStatusForTheTasksWithoutSchedule, resetUnrecognizedStatus),
      '8.2.0'
    ),
  };
}

function executeMigrationWithErrorHandling(
  migrationFunc: SavedObjectMigrationFn<ConcreteTaskInstance, ConcreteTaskInstance>,
  version: string
) {
  return (
    doc: SavedObjectUnsanitizedDoc<ConcreteTaskInstance>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      return migrationFunc(doc, context);
    } catch (ex) {
      context.log.error<TaskInstanceLogMeta>(
        `savedObject ${version} migration failed for task instance ${doc.id} with error: ${ex.message}`,
        {
          migrations: {
            taskInstanceDocument: doc,
          },
        }
      );
      throw ex;
    }
  };
}

function alertingTaskLegacyIdToSavedObjectIds(
  doc: SavedObjectUnsanitizedDoc<ConcreteTaskInstance>
): SavedObjectUnsanitizedDoc<ConcreteTaskInstance> {
  if (doc.attributes.taskType.startsWith('alerting:')) {
    let params: { spaceId?: string; alertId?: string } = {};
    params = JSON.parse(doc.attributes.params as unknown as string);

    if (params.alertId && params.spaceId && params.spaceId !== 'default') {
      const newId = SavedObjectsUtils.getConvertedObjectId(params.spaceId, 'alert', params.alertId);
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          params: JSON.stringify({
            ...params,
            alertId: newId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any,
        },
      };
    }
  }

  return doc;
}

function actionsTasksLegacyIdToSavedObjectIds(
  doc: SavedObjectUnsanitizedDoc<ConcreteTaskInstance>
): SavedObjectUnsanitizedDoc<ConcreteTaskInstance> {
  if (doc.attributes.taskType.startsWith('actions:')) {
    let params: { spaceId?: string; actionTaskParamsId?: string } = {};
    params = JSON.parse(doc.attributes.params as unknown as string);

    if (params.actionTaskParamsId && params.spaceId && params.spaceId !== 'default') {
      const newId = SavedObjectsUtils.getConvertedObjectId(
        params.spaceId,
        'action_task_params',
        params.actionTaskParamsId
      );
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          params: JSON.stringify({
            ...params,
            actionTaskParamsId: newId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any,
        },
      };
    }
  }

  return doc;
}

function moveIntervalIntoSchedule({
  attributes: { interval, ...attributes },
  ...doc
}: SavedObjectUnsanitizedDoc<ConcreteTaskInstance>): SavedObjectUnsanitizedDoc<ConcreteTaskInstance> {
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

function resetUnrecognizedStatus(
  doc: SavedObjectUnsanitizedDoc<ConcreteTaskInstance>
): SavedObjectUnsanitizedDoc<ConcreteTaskInstance> {
  const status = doc?.attributes?.status;
  if (status && status === 'unrecognized') {
    const taskType = doc.attributes.taskType;
    // If task type is in the REMOVED_TYPES list, maintain "unrecognized" status
    if (REMOVED_TYPES.indexOf(taskType) >= 0) {
      return doc;
    }

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        status: 'idle',
      },
    } as SavedObjectUnsanitizedDoc<ConcreteTaskInstance>;
  }

  return doc;
}

function pipeMigrations(...migrations: TaskInstanceMigration[]): TaskInstanceMigration {
  return (doc: SavedObjectUnsanitizedDoc<ConcreteTaskInstance>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}

function resetAttemptsAndStatusForTheTasksWithoutSchedule(
  doc: SavedObjectUnsanitizedDoc<ConcreteTaskInstance>
): SavedObjectUnsanitizedDoc<ConcreteTaskInstance> {
  if (doc.attributes.taskType.startsWith('alerting:')) {
    if (
      !doc.attributes.schedule?.interval &&
      (doc.attributes.status === TaskStatus.Failed || doc.attributes.status === TaskStatus.Running)
    ) {
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          attempts: 0,
          status: TaskStatus.Idle,
        },
      };
    }
  }

  return doc;
}
