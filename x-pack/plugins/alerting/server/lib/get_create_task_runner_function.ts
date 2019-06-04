/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { ActionsPlugin } from '../../../actions';
import { AlertType } from '../types';
import { TaskInstance } from '../../../task_manager';
import { createFireHandler } from './create_fire_handler';
import { createAlertInstanceFactory } from './create_alert_instance_factory';
import { AlertInstance } from './alert_instance';

interface CreateTaskRunnerFunctionOptions {
  alertType: AlertType;
  fireAction: ActionsPlugin['fire'];
  savedObjectsClient: SavedObjectsClient;
}

interface TaskRunnerOptions {
  taskInstance: TaskInstance;
}

export function getCreateTaskRunnerFunction({
  alertType,
  fireAction,
  savedObjectsClient,
}: CreateTaskRunnerFunctionOptions) {
  return ({ taskInstance }: TaskRunnerOptions) => {
    return {
      run: async () => {
        const alertSavedObject = await savedObjectsClient.get('alert', taskInstance.params.alertId);
        const fireHandler = createFireHandler({ alertSavedObject, fireAction });
        const alertInstances: Record<string, AlertInstance> = {};
        const alertInstancesData = taskInstance.state.alertInstances || {};
        for (const id of Object.keys(alertInstancesData)) {
          alertInstances[id] = new AlertInstance(alertInstancesData[id]);
        }
        const alertInstanceFactory = createAlertInstanceFactory(alertInstances);

        const services = {
          alertInstanceFactory,
        };

        const range = {
          // Add 1ms to the from, since the range is inclusive
          from: new Date(new Date(taskInstance.state.previousRange.to).getTime() + 1),
          to: new Date(taskInstance.state.scheduledRunAt),
        };

        const alertTypeState = await alertType.execute({
          range,
          services,
          params: alertSavedObject.attributes.alertTypeParams,
          state: taskInstance.state.alertTypeState || {},
        });

        for (const alertInstanceId of Object.keys(alertInstances)) {
          const alertInstance = alertInstances[alertInstanceId];

          // Unpersist any alert instances that were not explicitly fired in this alert execution
          if (!alertInstance.shouldFire()) {
            delete alertInstances[alertInstanceId];
            continue;
          }

          const { actionGroup, context, state } = alertInstance.getFireOptions()!;
          await fireHandler(actionGroup, context, state);
          alertInstance.replaceMeta({ lastFired: Date.now() });
          alertInstance.resetFire();
        }

        const nextRunAt = new Date(
          // In the scenario the task took longer than the interval time to run,
          // we'll catch up the next runAt to now.
          Math.max(
            new Date(taskInstance.state.scheduledRunAt).getTime() +
              alertSavedObject.attributes.interval,
            Date.now()
          )
        );
        return {
          state: {
            alertTypeState,
            alertInstances,
            scheduledRunAt: nextRunAt,
            previousRange: range,
          },
          runAt: nextRunAt,
        };
      },
    };
  };
}
