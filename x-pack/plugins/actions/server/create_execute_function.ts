/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsBulkResponse, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { RunNowResult, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  RawAction,
  ActionTypeRegistryContract,
  InMemoryConnector,
  ActionTaskExecutorParams,
} from './types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from './constants/saved_objects';
import { ExecuteOptions as ActionExecutorOptions } from './lib/action_executor';
import { extractSavedObjectReferences, isSavedObjectExecutionSource } from './lib';
import { ActionsConfigurationUtilities } from './actions_config';
import { hasReachedTheQueuedActionsLimit } from './lib/has_reached_queued_actions_limit';

interface CreateExecuteFunctionOptions {
  taskManager: TaskManagerStartContract;
  isESOCanEncrypt: boolean;
  actionTypeRegistry: ActionTypeRegistryContract;
  inMemoryConnectors: InMemoryConnector[];
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}

export interface ExecuteOptions
  extends Pick<ActionExecutorOptions, 'params' | 'source' | 'relatedSavedObjects' | 'consumer'> {
  id: string;
  spaceId: string;
  apiKey: string | null;
  executionId: string;
  actionTypeId: string;
}

interface ActionTaskParams
  extends Pick<ActionExecutorOptions, 'actionId' | 'params' | 'consumer' | 'relatedSavedObjects'> {
  apiKey: string | null;
  executionId: string;
}

export interface GetConnectorsResult {
  connector: InMemoryConnector | RawAction;
  isInMemory: boolean;
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

export enum ExecutionResponseType {
  SUCCESS = 'success',
  QUEUED_ACTIONS_LIMIT_ERROR = 'queuedActionsLimitError',
}

export interface ExecutionResponse {
  errors: boolean;
  items: ExecutionResponseItem[];
}

export interface ExecutionResponseItem {
  id: string;
  actionTypeId: string;
  response: ExecutionResponseType;
}

export function createBulkExecutionEnqueuerFunction({
  taskManager,
  actionTypeRegistry,
  isESOCanEncrypt,
  inMemoryConnectors,
  configurationUtilities,
  logger,
}: CreateExecuteFunctionOptions): BulkExecutionEnqueuer<ExecutionResponse> {
  return async function execute(
    unsecuredSavedObjectsClient: SavedObjectsClientContract,
    actionsToExecute: ExecuteOptions[]
  ) {
    if (!isESOCanEncrypt) {
      throw new Error(
        `Unable to execute actions because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
      );
    }

    const { hasReachedLimit, numberOverLimit } = await hasReachedTheQueuedActionsLimit(
      taskManager,
      configurationUtilities,
      actionsToExecute.length
    );
    let actionsOverLimit: ExecuteOptions[] = [];
    if (hasReachedLimit) {
      actionsOverLimit = actionsToExecute.splice(
        actionsToExecute.length - numberOverLimit,
        numberOverLimit
      );
    }

    const actionTypeIds: Record<string, string> = {};
    const spaceIds: Record<string, string> = {};
    const connectorIsInMemory: Record<string, boolean> = {};
    const connectorIds = [...new Set(actionsToExecute.map((action) => action.id))];
    const connectors = await getConnectors(
      unsecuredSavedObjectsClient,
      inMemoryConnectors,
      connectorIds
    );
    const runnableActions: ExecuteOptions[] = [];

    for (const c of connectors) {
      const { id, connector, isInMemory } = c;
      const { actionTypeId, name } = connector;

      try {
        validateConnector({ id, connector, actionTypeRegistry });
      } catch (e) {
        logger.warn(`Skipped the actions for the connector: ${name} (${id}). Error: ${e.message}`);
        continue;
      }

      const actionsWithCurrentConnector = actionsToExecute.filter((action) => action.id === id);

      if (actionsWithCurrentConnector.length > 0) {
        runnableActions.push(...actionsWithCurrentConnector);
      }

      actionTypeIds[id] = actionTypeId;
      connectorIsInMemory[id] = isInMemory;
    }

    const actions = runnableActions.map((actionToExecute) => {
      // Get saved object references from action ID and relatedSavedObjects
      const { references, relatedSavedObjectWithRefs } = extractSavedObjectReferences(
        actionToExecute.id,
        connectorIsInMemory[actionToExecute.id],
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
          ...(actionToExecute.source ? { source: actionToExecute.source.type } : {}),
        },
        references: taskReferences,
      };
    });
    const actionTaskParamsRecords: SavedObjectsBulkResponse<ActionTaskParams> =
      await unsecuredSavedObjectsClient.bulkCreate(actions, { refresh: false });

    const taskInstances = actionTaskParamsRecords.saved_objects.map((so) => {
      const actionId = so.attributes.actionId;
      return {
        taskType: `actions:${actionTypeIds[actionId]}`,
        params: {
          spaceId: spaceIds[actionId],
          actionTaskParamsId: so.id,
        },
        state: {},
        scope: ['actions'],
      };
    });

    await taskManager.bulkSchedule(taskInstances);

    return {
      errors: actionsOverLimit.length > 0,
      items: runnableActions
        .map((a) => ({
          id: a.id,
          actionTypeId: a.actionTypeId,
          response: ExecutionResponseType.SUCCESS,
        }))
        .concat(
          actionsOverLimit.map((a) => ({
            id: a.id,
            actionTypeId: a.actionTypeId,
            response: ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR,
          }))
        ),
    };
  };
}

export function createEphemeralExecutionEnqueuerFunction({
  taskManager,
  actionTypeRegistry,
  inMemoryConnectors,
  logger,
}: CreateExecuteFunctionOptions): ExecutionEnqueuer<RunNowResult> {
  return async function execute(
    unsecuredSavedObjectsClient: SavedObjectsClientContract,
    { id, params, spaceId, source, consumer, apiKey, executionId }: ExecuteOptions
  ): Promise<RunNowResult> {
    const { connector } = await getConnector(unsecuredSavedObjectsClient, inMemoryConnectors, id);

    validateConnector({ id, connector, actionTypeRegistry });

    const taskParams: ActionTaskExecutorParams = {
      spaceId,
      taskParams: {
        actionId: id,
        consumer,
        // Saved Objects won't allow us to enforce unknown rather than any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params: params as Record<string, any>,
        ...(apiKey ? { apiKey } : {}),
        ...(executionId ? { executionId } : {}),
      },
      ...executionSourceAsSavedObjectReferences(source),
    };

    return taskManager.ephemeralRunNow({
      taskType: `actions:${connector.actionTypeId}`,
      params: taskParams,
      state: {},
      scope: ['actions'],
    });
  };
}

function validateConnector({
  id,
  connector,
  actionTypeRegistry,
}: {
  id: string;
  connector: InMemoryConnector | RawAction;
  actionTypeRegistry: ActionTypeRegistryContract;
}) {
  const { name, isMissingSecrets, actionTypeId } = connector;

  if (isMissingSecrets) {
    throw new Error(
      `Unable to execute action because no secrets are defined for the "${name}" connector.`
    );
  }

  if (!actionTypeRegistry.isActionExecutable(id, actionTypeId, { notifyUsage: true })) {
    actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
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

async function getConnector(
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  inMemoryConnectors: InMemoryConnector[],
  actionId: string
): Promise<{ connector: InMemoryConnector | RawAction; isInMemory: boolean }> {
  const inMemoryAction = inMemoryConnectors.find((action) => action.id === actionId);

  if (inMemoryAction) {
    return { connector: inMemoryAction, isInMemory: true };
  }

  const { attributes } = await unsecuredSavedObjectsClient.get<RawAction>('action', actionId);
  return { connector: attributes, isInMemory: false };
}

async function getConnectors(
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  inMemoryConnectors: InMemoryConnector[],
  connectorIds: string[]
): Promise<GetConnectorsResult[]> {
  const result: GetConnectorsResult[] = [];

  const connectorIdsToFetch = [];
  for (const connectorId of connectorIds) {
    const pcConnector = inMemoryConnectors.find((connector) => connector.id === connectorId);

    if (pcConnector) {
      result.push({ connector: pcConnector, isInMemory: true, id: connectorId });
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
        isInMemory: false,
        connector: item.attributes,
        id: item.id,
      });
    }
  }

  return result;
}
