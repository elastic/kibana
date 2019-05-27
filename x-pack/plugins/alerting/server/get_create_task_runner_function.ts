/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { ActionsPlugin } from '../../actions';
import { AlertType, AlertInstanceData } from './types';
import { TaskInstance } from '../../task_manager';
import { createFireHandler } from './create_fire_handler';
import { createAlertInstanceFactory } from './create_alert_instance_factory';

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
        const alertInstances = (taskInstance.state.alertInstances || {}) as Record<
          string,
          AlertInstanceData
        >;
        const alertInstanceFactory = createAlertInstanceFactory(alertInstances);

        const services = {
          alertInstanceFactory: createAlertInstanceFactory(alertInstances),
        };

        const alertTypeState = await alertType.execute({
          services,
          params: alertSavedObject.attributes.alertTypeParams,
          state: taskInstance.state.alertTypeState,
        });

        for (const alertInstanceId of Object.keys(alertInstances)) {
          const alertInstance = alertInstanceFactory(alertInstanceId);

          // Unpersist any alert instances that were not explicitly fired in this alert execution
          if (!alertInstance.getFireOptions()) {
            delete alertInstances[alertInstanceId];
            continue;
          }

          const { actionGroup, context, state } = alertInstance.getFireOptions()!;
          await fireHandler(actionGroup, context, state);
          alertInstance.replaceState({
            ...alertInstance.getPreviousState(),
            lastFired: Date.now(),
          });

          alertInstance.clearFireOptions();
        }

        return {
          state: {
            alertTypeState,
            alertInstances,
          },
          // TODO: Should it be now + interval or previous runAt + interval
          runAt: alertSavedObject.attributes.interval
            ? new Date(Date.now() + alertSavedObject.attributes.interval * 1000)
            : undefined,
        };
      },
    };
  };
}
