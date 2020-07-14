/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from '../../../../src/core/server';
import { TaskManagerStartContract } from '../../task_manager/server';
import { RawAction, ActionTypeRegistryContract, PreConfiguredAction } from './types';

interface CreateExecuteFunctionOptions {
  taskManager: TaskManagerStartContract;
  isESOUsingEphemeralEncryptionKey: boolean;
  actionTypeRegistry: ActionTypeRegistryContract;
  preconfiguredActions: PreConfiguredAction[];
}

export interface ExecuteOptions {
  id: string;
  params: Record<string, unknown>;
  spaceId: string;
  apiKey: string | null;
}

export type ExecutionEnqueuer = (
  savedObjectsClient: SavedObjectsClientContract,
  options: ExecuteOptions
) => Promise<void>;

export function createExecutionEnqueuerFunction({
  taskManager,
  actionTypeRegistry,
  isESOUsingEphemeralEncryptionKey,
  preconfiguredActions,
}: CreateExecuteFunctionOptions) {
  return async function execute(
    savedObjectsClient: SavedObjectsClientContract,
    { id, params, spaceId, apiKey }: ExecuteOptions
  ) {
    if (isESOUsingEphemeralEncryptionKey === true) {
      throw new Error(
        `Unable to execute action due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
      );
    }

    const actionTypeId = await getActionTypeId(id);

    if (!actionTypeRegistry.isActionExecutable(id, actionTypeId)) {
      actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
    }

    const actionTaskParamsRecord = await savedObjectsClient.create('action_task_params', {
      actionId: id,
      params,
      apiKey,
    });

    await taskManager.schedule({
      taskType: `actions:${actionTypeId}`,
      params: {
        spaceId,
        actionTaskParamsId: actionTaskParamsRecord.id,
      },
      state: {},
      scope: ['actions'],
    });

    async function getActionTypeId(actionId: string): Promise<string> {
      const pcAction = preconfiguredActions.find((action) => action.id === actionId);
      if (pcAction) {
        return pcAction.actionTypeId;
      }

      const actionSO = await savedObjectsClient.get<RawAction>('action', actionId);
      return actionSO.attributes.actionTypeId;
    }
  };
}
