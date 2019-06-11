/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/legacy/server/saved_objects';
import { ActionsPlugin } from '../../../actions';
import { AlertType, Services, AlertServices } from '../types';
import { TaskInstance } from '../../../task_manager';
import { createFireHandler } from './create_fire_handler';
import { createAlertInstanceFactory } from './create_alert_instance_factory';
import { AlertInstance } from './alert_instance';
import { getNextRunAt } from './get_next_run_at';

interface CreateTaskRunnerFunctionOptions {
  services: Services;
  alertType: AlertType;
  fireAction: ActionsPlugin['fire'];
  savedObjectsClient: SavedObjectsClientContract;
}

interface TaskRunnerOptions {
  taskInstance: TaskInstance;
}

export function getCreateTaskRunnerFunction({
  services,
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

        const alertTypeServices: AlertServices = {
          ...services,
          alertInstanceFactory,
        };

        const alertTypeState = await alertType.execute({
          services: alertTypeServices,
          params: alertSavedObject.attributes.alertTypeParams,
          state: taskInstance.state.alertTypeState || {},
          scheduledRunAt: taskInstance.state.scheduledRunAt,
          previousScheduledRunAt: taskInstance.state.previousScheduledRunAt,
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

        const nextRunAt = getNextRunAt(
          new Date(taskInstance.state.scheduledRunAt),
          alertSavedObject.attributes.interval
        );

        return {
          state: {
            alertTypeState,
            alertInstances,
            // We store nextRunAt ourselves since task manager changes runAt when executing a task
            scheduledRunAt: nextRunAt,
            previousScheduledRunAt: taskInstance.state.scheduledRunAt,
          },
          runAt: nextRunAt,
        };
      },
    };
  };
}
