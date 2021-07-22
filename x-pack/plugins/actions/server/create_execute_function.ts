/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '../../../../src/core/server';
import { RunNowResult, TaskManagerStartContract } from '../../task_manager/server';
import {
  RawAction,
  ActionTypeRegistryContract,
  PreConfiguredAction,
  ActionTaskExecutorParams,
} from './types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from './constants/saved_objects';
import { ExecuteOptions as ActionExecutorOptions } from './lib/action_executor';
import { isSavedObjectExecutionSource } from './lib';
import { RelatedSavedObjects } from './lib/related_saved_objects';

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
  relatedSavedObjects?: RelatedSavedObjects;
}

export type ExecutionEnqueuer<T> = (
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  options: ExecuteOptions
) => Promise<T>;

export function createExecutionEnqueuerFunction({
  taskManager,
  actionTypeRegistry,
  isESOCanEncrypt,
  preconfiguredActions,
}: CreateExecuteFunctionOptions): ExecutionEnqueuer<void> {
  return async function execute(
    unsecuredSavedObjectsClient: SavedObjectsClientContract,
    { id, params, spaceId, source, apiKey, relatedSavedObjects }: ExecuteOptions
  ) {
    if (!isESOCanEncrypt) {
      throw new Error(
        `Unable to execute action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
      );
    }

    const action = await getAction(unsecuredSavedObjectsClient, preconfiguredActions, id);
    validateCanActionBeUsed(action);

    const { actionTypeId } = action;
    if (!actionTypeRegistry.isActionExecutable(id, actionTypeId, { notifyUsage: true })) {
      actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
    }

    const actionTaskParamsRecord = await unsecuredSavedObjectsClient.create(
      ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      {
        actionId: id,
        params,
        apiKey,
        relatedSavedObjects,
      },
      executionSourceAsSavedObjectReferences(source)
    );

    await taskManager.schedule({
      taskType: `actions:${action.actionTypeId}`,
      params: {
        spaceId,
        actionTaskParamsId: actionTaskParamsRecord.id,
      },
      state: {},
      scope: ['actions'],
    });
  };
}

export function createEphemeralExecutionEnqueuerFunction({
  taskManager,
  actionTypeRegistry,
  preconfiguredActions,
}: CreateExecuteFunctionOptions): ExecutionEnqueuer<RunNowResult> {
  return async function execute(
    unsecuredSavedObjectsClient: SavedObjectsClientContract,
    { id, params, spaceId, source, apiKey }: ExecuteOptions
  ): Promise<RunNowResult> {
    const action = await getAction(unsecuredSavedObjectsClient, preconfiguredActions, id);
    validateCanActionBeUsed(action);

    const { actionTypeId } = action;
    if (!actionTypeRegistry.isActionExecutable(id, actionTypeId, { notifyUsage: true })) {
      actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
    }

    const taskParams: ActionTaskExecutorParams = {
      spaceId,
      taskParams: {
        actionId: id,
        // Saved Objects won't allow us to enforce unknown rather than any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params: params as Record<string, any>,
        ...(apiKey ? { apiKey } : {}),
      },
      ...executionSourceAsSavedObjectReferences(source),
    };

    return taskManager.ephemeralRunNow({
      taskType: `actions:${action.actionTypeId}`,
      params: taskParams,
      state: {},
      scope: ['actions'],
    });
  };
}

function validateCanActionBeUsed(action: PreConfiguredAction | RawAction) {
  const { name, isMissingSecrets } = action;
  if (isMissingSecrets) {
    throw new Error(
      `Unable to execute action because no secrets are defined for the "${name}" connector.`
    );
  }
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

async function getAction(
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  preconfiguredActions: PreConfiguredAction[],
  actionId: string
): Promise<PreConfiguredAction | RawAction> {
  const pcAction = preconfiguredActions.find((action) => action.id === actionId);
  if (pcAction) {
    return pcAction;
  }

  const { attributes } = await unsecuredSavedObjectsClient.get<RawAction>('action', actionId);
  return attributes;
}
