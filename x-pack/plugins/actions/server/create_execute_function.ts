/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsBulkResponse, SavedObjectsClientContract } from '@kbn/core/server';
import { QueuePluginStart } from '@kbn/queue-plugin/server';
import { RawAction, ActionTypeRegistryContract, PreConfiguredAction } from './types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from './constants/saved_objects';
import { ExecuteOptions as ActionExecutorOptions } from './lib/action_executor';
import { extractSavedObjectReferences, isSavedObjectExecutionSource } from './lib';

interface CreateExecuteFunctionOptions {
  queue: QueuePluginStart;
  isESOCanEncrypt: boolean;
  actionTypeRegistry: ActionTypeRegistryContract;
  preconfiguredActions: PreConfiguredAction[];
}

export interface ExecuteOptions
  extends Pick<ActionExecutorOptions, 'params' | 'source' | 'relatedSavedObjects' | 'consumer'> {
  id: string;
  spaceId: string;
  apiKey: string | null;
  executionId: string;
}

interface ActionTaskParams
  extends Pick<ActionExecutorOptions, 'actionId' | 'params' | 'consumer' | 'relatedSavedObjects'> {
  apiKey: string | null;
  executionId: string;
}

export interface GetConnectorsResult {
  connector: PreConfiguredAction | RawAction;
  isPreconfigured: boolean;
  id: string;
}

export type ExecutionEnqueuer<T> = (
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  options: ExecuteOptions
) => Promise<T>;

export type BulkExecutionEnqueuer<T> = (
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  actionsToExectute: ExecuteOptions[]
) => Promise<T>;

export function createExecutionEnqueuerFunction({
  queue,
  actionTypeRegistry,
  isESOCanEncrypt,
  preconfiguredActions,
}: CreateExecuteFunctionOptions): ExecutionEnqueuer<void> {
  return async function execute(
    unsecuredSavedObjectsClient: SavedObjectsClientContract,
    {
      id,
      params,
      spaceId,
      consumer,
      source,
      apiKey,
      executionId,
      relatedSavedObjects,
    }: ExecuteOptions
  ) {
    if (!isESOCanEncrypt) {
      throw new Error(
        `Unable to execute action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
      );
    }

    const { action, isPreconfigured } = await getAction(
      unsecuredSavedObjectsClient,
      preconfiguredActions,
      id
    );
    validateCanActionBeUsed(action);

    const { actionTypeId } = action;
    if (!actionTypeRegistry.isActionExecutable(id, actionTypeId, { notifyUsage: true })) {
      actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
    }

    // Get saved object references from action ID and relatedSavedObjects
    const { references, relatedSavedObjectWithRefs } = extractSavedObjectReferences(
      id,
      isPreconfigured,
      relatedSavedObjects
    );
    const executionSourceReference = executionSourceAsSavedObjectReferences(source);

    const taskReferences = [];
    if (executionSourceReference.references) {
      taskReferences.push(...executionSourceReference.references);
    }
    if (references) {
      taskReferences.push(...references);
    }

    const actionTaskParamsRecord = await unsecuredSavedObjectsClient.create(
      ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      {
        actionId: id,
        params,
        apiKey,
        executionId,
        consumer,
        relatedSavedObjects: relatedSavedObjectWithRefs,
      },
      {
        references: taskReferences,
      }
    );

    await queue.enqueue({
      workerId: `actions:${action.actionTypeId}`,
      params: {
        spaceId,
        actionTaskParamsId: actionTaskParamsRecord.id,
      },
    });
  };
}

export function createBulkExecutionEnqueuerFunction({
  queue,
  actionTypeRegistry,
  isESOCanEncrypt,
  preconfiguredActions,
}: CreateExecuteFunctionOptions): BulkExecutionEnqueuer<void> {
  return async function execute(
    unsecuredSavedObjectsClient: SavedObjectsClientContract,
    actionsToExecute: ExecuteOptions[]
  ) {
    if (!isESOCanEncrypt) {
      throw new Error(
        `Unable to execute actions because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
      );
    }

    const actionTypeIds: Record<string, string> = {};
    const spaceIds: Record<string, string> = {};
    const connectorIsPreconfigured: Record<string, boolean> = {};
    const connectorIds = [...new Set(actionsToExecute.map((action) => action.id))];
    const connectors = await getConnectors(
      unsecuredSavedObjectsClient,
      preconfiguredActions,
      connectorIds
    );
    connectors.forEach((c) => {
      const { id, connector, isPreconfigured } = c;
      validateCanActionBeUsed(connector);

      const { actionTypeId } = connector;
      if (!actionTypeRegistry.isActionExecutable(id, actionTypeId, { notifyUsage: true })) {
        actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
      }

      actionTypeIds[id] = actionTypeId;
      connectorIsPreconfigured[id] = isPreconfigured;
    });

    const actions = actionsToExecute.map((actionToExecute) => {
      // Get saved object references from action ID and relatedSavedObjects
      const { references, relatedSavedObjectWithRefs } = extractSavedObjectReferences(
        actionToExecute.id,
        connectorIsPreconfigured[actionToExecute.id],
        actionToExecute.relatedSavedObjects
      );
      const executionSourceReference = executionSourceAsSavedObjectReferences(
        actionToExecute.source
      );

      const taskReferences = [];
      if (executionSourceReference.references) {
        taskReferences.push(...executionSourceReference.references);
      }
      if (references) {
        taskReferences.push(...references);
      }

      spaceIds[actionToExecute.id] = actionToExecute.spaceId;

      return {
        type: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
        attributes: {
          actionId: actionToExecute.id,
          params: actionToExecute.params,
          apiKey: actionToExecute.apiKey,
          executionId: actionToExecute.executionId,
          consumer: actionToExecute.consumer,
          relatedSavedObjects: relatedSavedObjectWithRefs,
        },
        references: taskReferences,
      };
    });
    const actionTaskParamsRecords: SavedObjectsBulkResponse<ActionTaskParams> =
      await unsecuredSavedObjectsClient.bulkCreate(actions);
    await queue.bulkEnqueue(
      actionTaskParamsRecords.saved_objects.map((so) => ({
        workerId: `actions:${actionTypeIds[so.attributes.actionId]}`,
        params: {
          spaceId: spaceIds[so.attributes.actionId],
          actionTaskParamsId: so.id,
        },
      }))
    );
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
): Promise<{ action: PreConfiguredAction | RawAction; isPreconfigured: boolean }> {
  const pcAction = preconfiguredActions.find((action) => action.id === actionId);
  if (pcAction) {
    return { action: pcAction, isPreconfigured: true };
  }

  const { attributes } = await unsecuredSavedObjectsClient.get<RawAction>('action', actionId);
  return { action: attributes, isPreconfigured: false };
}

async function getConnectors(
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  preconfiguredConnectors: PreConfiguredAction[],
  connectorIds: string[]
): Promise<GetConnectorsResult[]> {
  const result: GetConnectorsResult[] = [];

  const connectorIdsToFetch = [];
  for (const connectorId of connectorIds) {
    const pcConnector = preconfiguredConnectors.find((connector) => connector.id === connectorId);
    if (pcConnector) {
      result.push({ connector: pcConnector, isPreconfigured: true, id: connectorId });
    } else {
      connectorIdsToFetch.push(connectorId);
    }
  }

  if (connectorIdsToFetch.length > 0) {
    const bulkGetResult = await unsecuredSavedObjectsClient.bulkGet<RawAction>(
      connectorIdsToFetch.map((id) => ({
        id,
        type: 'action',
      }))
    );

    for (const item of bulkGetResult.saved_objects) {
      if (item.error) throw item.error;
      result.push({
        isPreconfigured: false,
        connector: item.attributes,
        id: item.id,
      });
    }
  }

  return result;
}
