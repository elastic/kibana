/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsPlugin } from '../../actions';
import { AlertType } from './types';
import { TaskInstance } from '../../task_manager';
import { createFireHandler } from './create_fire_handler';
import { createAlertInstanceFactory } from './create_alert_instance_factory';
import { AlertInstance } from './alert_instance';

interface TaskRunnerOptions {
  taskInstance: TaskInstance;
}

export function getCreateTaskRunnerFunction(
  alertType: AlertType,
  fireAction: ActionsPlugin['fire']
) {
  return ({ taskInstance }: TaskRunnerOptions) => {
    const fireHandler = createFireHandler(alertType, taskInstance, fireAction);
    return {
      run: async () => {
        const alertInstances = (taskInstance.state.alertInstances || {}) as Record<
          string,
          AlertInstance
        >;

        const services = {
          alertInstanceFactory: createAlertInstanceFactory(alertInstances),
        };

        const updatedState = await alertType.execute(services, taskInstance.params.checkParams);

        for (const alertInstanceId of Object.keys(alertInstances)) {
          const alertInstance = alertInstances[alertInstanceId];

          // Unpersist any alert instances that were not explicitly fired in this alert execution
          if (!alertInstance.getFireOptions()) {
            delete alertInstances[alertInstanceId];
            continue;
          }

          const { actionGroupId, context, state } = alertInstance.getFireOptions()!;
          await fireHandler(actionGroupId, context, state);
          alertInstance.replaceState({
            ...alertInstance.getPreviousState(),
            lastFired: Date.now(),
          });

          alertInstance.clearFireOptions();
        }

        return {
          state: {
            ...(updatedState || {}),
            alertInstances,
          },
          // TODO: Should it be now + interval or previous runAt + interval
          runAt: taskInstance.params.interval
            ? Date.now() + taskInstance.params.interval
            : undefined,
        };
      },
    };
  };
}
