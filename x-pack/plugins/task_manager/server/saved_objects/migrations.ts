/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  LogMeta,
  SavedObjectMigrationContext,
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
  SavedObjectsUtils,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core/server';
import { RuleTaskState } from '@kbn/alerting-plugin/common';
import { TrackedLifecycleAlertState } from '@kbn/rule-registry-plugin/server/utils/create_lifecycle_executor';
import { REMOVED_TYPES } from '../task_type_dictionary';
import { SerializedConcreteTaskInstance, TaskStatus } from '../task';

interface TaskInstanceLogMeta extends LogMeta {
  migrations: { taskInstanceDocument: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance> };
}

type TaskInstanceMigration = (
  doc: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>
) => SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>;

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
    '8.5.0': executeMigrationWithErrorHandling(pipeMigrations(addEnabledField), '8.5.0'),
    '8.8.0': executeMigrationWithErrorHandling(pipeMigrations(addAlertUUID), '8.8.0'),
  };
}

function executeMigrationWithErrorHandling(
  migrationFunc: SavedObjectMigrationFn<
    SerializedConcreteTaskInstance,
    SerializedConcreteTaskInstance
  >,
  version: string
) {
  return (
    doc: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>,
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
  doc: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>
): SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance> {
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
  doc: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>
): SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance> {
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
}: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>): SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance> {
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
  doc: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>
): SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance> {
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
    } as SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>;
  }

  return doc;
}

function pipeMigrations(...migrations: TaskInstanceMigration[]): TaskInstanceMigration {
  return (doc: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}

function resetAttemptsAndStatusForTheTasksWithoutSchedule(
  doc: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>
): SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance> {
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

function addEnabledField(doc: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>) {
  if (
    doc.attributes.status === TaskStatus.Failed ||
    doc.attributes.status === TaskStatus.Unrecognized
  ) {
    return doc;
  }

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      enabled: true,
    },
  };
}

function addAlertUUID(doc: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>) {
  if (!doc.attributes.taskType.startsWith('alerting:')) return doc;
  if (!doc.attributes.state) return doc;

  const ruleState: RuleTaskState = JSON.parse(doc.attributes.state);
  if (!ruleState) return doc;

  const trackedAlerts = getTrackedAlerts(ruleState.alertTypeState);

  const alertUUIDs = new Map<string, string>();
  addAlertUUIDs(ruleState.alertInstances, trackedAlerts, alertUUIDs);
  addAlertUUIDs(ruleState.alertRecoveredInstances, trackedAlerts, alertUUIDs);

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      state: JSON.stringify(ruleState),
    },
  };
}

function getTrackedAlerts(
  trAlerts?: Record<string, unknown>
): Map<string, TrackedLifecycleAlertState> {
  const result = new Map<string, TrackedLifecycleAlertState>();
  if (!trAlerts) return result;

  for (const id of Object.keys(trAlerts)) {
    result.set(id, trAlerts[id] as unknown as TrackedLifecycleAlertState);
  }
  return result;
}

// mutates alerts passed in
function addAlertUUIDs(
  alerts: RuleTaskState['alertInstances'] | undefined,
  trackedAlerts: Map<string, TrackedLifecycleAlertState>,
  alertUUIDs: Map<string, string>
): void {
  if (!alerts) return;

  for (const id of Object.keys(alerts)) {
    const alert = alerts[id];
    if (!alert.meta) alert.meta = {};

    const trackedAlert = trackedAlerts.get(id);
    const recentUUID = alertUUIDs.get(id);
    if (trackedAlert?.alertUuid) {
      alert.meta.uuid = trackedAlert.alertUuid;
    } else if (recentUUID) {
      alert.meta.uuid = recentUUID;
    } else {
      alert.meta.uuid = uuidv4();
    }

    alertUUIDs.set(id, alert.meta.uuid);
  }
}
