/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType, Services } from './types';
import { TaskInstance } from '../../task_manager';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
import { throwIfActionTypeConfigInvalid } from './throw_if_action_type_config_invalid';
import { throwIfActionTypeParamsInvalid } from './throw_if_action_type_params_invalid';

interface CreateTaskRunnerFunctionOptions {
  services: Services;
  actionType: ActionType;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
}

interface TaskRunnerOptions {
  taskInstance: TaskInstance;
}

export function getCreateTaskRunnerFunction({
  services,
  actionType,
  encryptedSavedObjectsPlugin,
}: CreateTaskRunnerFunctionOptions) {
  return ({ taskInstance }: TaskRunnerOptions) => {
    return {
      run: async () => {
        const { namespace, id, actionTypeParams } = taskInstance.params;
        const action = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser('action', id, {
          namespace,
        });
        const mergedActionTypeConfig = {
          ...(action.attributes.actionTypeConfig || {}),
          ...(action.attributes.actionTypeConfigSecrets || {}),
        };
        throwIfActionTypeConfigInvalid(actionType, mergedActionTypeConfig);
        throwIfActionTypeParamsInvalid(actionType, actionTypeParams);
        await actionType.executor({
          services,
          actionTypeConfig: mergedActionTypeConfig,
          params: actionTypeParams,
        });
      },
    };
  };
}
