/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '../../../../src/core/server';
import { TaskManagerStartContract } from '../../task_manager/server';
import { RawAction, ActionTypeRegistryContract, PreConfiguredAction } from './types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from './saved_objects';
import { ExecuteOptions as ActionExecutorOptions } from './lib/action_executor';
import { isSavedObjectExecutionSource } from './lib';

interface CreateExecuteFunctionOptions {
  taskManager: TaskManagerStartContract;
  isESOCanEncrypt: boolean;
  actionTypeRegistry: ActionTypeRegistryContract;
  preconfiguredActions: PreConfiguredAction[];
}

export interface ExecuteOptions extends Pick<ActionExecutorOptions, 'params' | 'source'> {
  id: string;
  spaceId: string;
  apiKey: string | null;
}

export type ExecutionEnqueuer = (
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  options: ExecuteOptions
) => Promise<void>;

export function createExecutionEnqueuerFunction({
  taskManager,
  actionTypeRegistry,
  isESOCanEncrypt,
  preconfiguredActions,
}: CreateExecuteFunctionOptions) {
  return async function execute(
    unsecuredSavedObjectsClient: SavedObjectsClientContract,
    { id, params, spaceId, source, apiKey }: ExecuteOptions
  ) {
    if (!isESOCanEncrypt) {
      throw new Error(
        `Unable to execute action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
      );
    }

    const actionTypeId = await getActionTypeId(
      unsecuredSavedObjectsClient,
      preconfiguredActions,
      id
    );

    if (!actionTypeRegistry.isActionExecutable(id, actionTypeId, { notifyUsage: true })) {
      actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
    }

    const actionTaskParamsRecord = await unsecuredSavedObjectsClient.create(
      ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      {
        actionId: id,
        params,
        apiKey,
      },
      executionSourceAsSavedObjectReferences(source)
    );

    await taskManager.schedule({
      taskType: `actions:${actionTypeId}`,
      params: {
        spaceId,
        actionTaskParamsId: actionTaskParamsRecord.id,
      },
      state: {},
      scope: ['actions'],
    });
  };
}

function executionSourceAsSavedObjectReferences(executionSource: ActionExecutorOptions['source']) {
  return isSavedObjectExecutionSource(executionSource)
    ? {
        references: [
          {
            name: 'source',
            ...executionSource.source,
          },
        ],
      }
    : {};
}

async function getActionTypeId(
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  preconfiguredActions: PreConfiguredAction[],
  actionId: string
): Promise<string> {
  const pcAction = preconfiguredActions.find((action) => action.id === actionId);
  if (pcAction) {
    return pcAction.actionTypeId;
  }

  const {
    attributes: { actionTypeId },
  } = await unsecuredSavedObjectsClient.get<RawAction>('action', actionId);
  return actionTypeId;
}
