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
    '8.7.0': executeMigrationWithErrorHandling(pipeMigrations(moveRuleStateToMeta), '8.7.0'),
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

// move start/end/duration from alert instance state to meta
function moveRuleStateToMeta(doc: SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance>) {
  // see: x-pack/plugins/alerting/common/alert_instance.ts
  // old fields we're copying from
  interface AlertState {
    start?: string;
    end?: string;
    duration?: string;
  }
  // new fields we're copying to
  interface AlertMeta {
    start?: string;
    end?: string;
    duration?: string;
  }
  interface AlertInstance {
    state?: AlertState;
    meta?: AlertMeta;
  }
  type AlertInstances = Record<string, AlertInstance>;

  // see x-pack/plugins/alerting/common/rule_task_instance.ts for this shape
  interface RuleState {
    alertInstances?: AlertInstances;
    alertRecoveredInstances?: AlertInstances;
  }

  if (!doc.attributes.taskType.startsWith('alerting:')) return doc;
  if (!doc.attributes.state) return doc;

  const ruleState: RuleState = JSON.parse(doc.attributes.state);

  fixAlerts(ruleState.alertInstances);
  fixAlerts(ruleState.alertRecoveredInstances);

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      state: JSON.stringify(ruleState),
    },
  };

  // mutates alerts passed in
  function fixAlerts(alerts?: AlertInstances): void {
    if (!alerts) return;

    for (const id of Object.keys(alerts)) {
      const alert = alerts[id];
      const { state } = alert;

      // if no state, or no state.start/end/duration, return
      if (!state) continue;
      if (!state.start && !state.end && !state.duration) continue;

      alert.meta = alert.meta || {};

      // We only copy the fields to their right place; in case
      // some rule type was using the values in their old place,
      // we'll leave them where they are, though won't be updating them.
      if (state.start) {
        alert.meta.start = state.start;
      }
      if (state.end) {
        alert.meta.end = state.end;
      }
      if (state.duration) {
        // duration needs to be a string, but previously stored as a number un-migrated,
        // before we changed to store as strings in https://github.com/elastic/kibana/pull/130819
        alert.meta.duration = BigInt(state.duration).toString();
      }
    }
  }
}
