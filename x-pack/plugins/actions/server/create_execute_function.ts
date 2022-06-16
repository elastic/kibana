/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { SavedObjectsClientContract, Logger, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import {
  RunNowResult,
  TaskManagerStartContract,
  ScheduleOpts,
} from '@kbn/task-manager-plugin/server';
import {
  RawAction,
  ActionTypeRegistryContract,
  PreConfiguredAction,
  ActionTaskExecutorParams,
  ActionTaskParams,
} from './types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from './constants/saved_objects';
import { ExecuteOptions as ActionExecutorOptions } from './lib/action_executor';
import { extractSavedObjectReferences, isSavedObjectExecutionSource } from './lib';
import { RelatedSavedObjects } from './lib/related_saved_objects';

const MAX_ACTIONS_NUMBER_FOR_BULK_EXECUTE = 1000;
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
  executionId: string;
  consumer?: string;
  relatedSavedObjects?: RelatedSavedObjects;
}

export type ExecutionEnqueuer<T> = (
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  options: ExecuteOptions
) => Promise<T>;

export type BulkExecutionEnqueuer<T> = (
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  options: ExecuteOptions[],
  logger: Logger
) => Promise<T>;

export function createExecutionEnqueuerFunction({
  taskManager,
  actionTypeRegistry,
  isESOCanEncrypt,
  preconfiguredActions,
}: CreateExecuteFunctionOptions): BulkExecutionEnqueuer<void> {
  return async function execute(
    unsecuredSavedObjectsClient: SavedObjectsClientContract,
    actionsToExecute: ExecuteOptions[],
    logger: Logger
  ) {
    if (!isESOCanEncrypt) {
      throw new Error(
        `Unable to execute action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
      );
    }

    const connectorIds = [...new Set(actionsToExecute.map((action) => action.id))];
    const connectors = await getConnectors(
      unsecuredSavedObjectsClient,
      preconfiguredActions,
      connectorIds
    );

    // Filter out invalid connectors
    const validConnectors = getValidConnectors(connectors, actionTypeRegistry, logger);

    const actionTaskParamsToCreate: Array<SavedObjectsBulkCreateObject<ActionTaskParams>> = [];

    for (const action of actionsToExecute) {
      const connector = validConnectors.find((c) => c.id === action.id);

      if (connector) {
        // Get saved object references from action ID and relatedSavedObjects
        const { references, relatedSavedObjectWithRefs } = extractSavedObjectReferences(
          action.id,
          connector.isPreconfigured,
          action.relatedSavedObjects
        );
        const executionSourceReference = executionSourceAsSavedObjectReferences(action.source);

        const taskReferences = [];
        if (executionSourceReference.references) {
          taskReferences.push(...executionSourceReference.references);
        }
        if (references) {
          taskReferences.push(...references);
        }

        actionTaskParamsToCreate.push({
          type: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
          attributes: {
            actionId: action.id,
            params: action.params,
            ...(action.apiKey ? { apiKey: action.apiKey } : {}),
            executionId: action.executionId,
            consumer: action.consumer,
            spaceId: action.spaceId,
            relatedSavedObjects: relatedSavedObjectWithRefs,
          } as ActionTaskParams,
          references: taskReferences,
        });
      }
    }

    const actionTaskParamChunks = chunk(
      actionTaskParamsToCreate,
      MAX_ACTIONS_NUMBER_FOR_BULK_EXECUTE
    );

    for (const actionTaskParamChunk of actionTaskParamChunks) {
      const actionTaskParamsSavedObject =
        await unsecuredSavedObjectsClient.bulkCreate<ActionTaskParams>(actionTaskParamChunk);

      const bulkScheduleOpts: ScheduleOpts[] = [];
      for (const actionTaskParam of actionTaskParamsSavedObject.saved_objects) {
        if (actionTaskParam.error) {
          logger.error(
            `Error creating action task params for action ${actionTaskParam.id}. Underlying task will not be scheduled - ${actionTaskParam.error.message}`
          );
        } else {
          const connector = validConnectors.find(
            (c) => c.id === actionTaskParam.attributes.actionId
          )!;
          bulkScheduleOpts.push({
            taskInstance: {
              taskType: `actions:${connector.connector.actionTypeId}`,
              params: {
                spaceId: actionTaskParam.attributes.spaceId,
                actionTaskParamsId: actionTaskParam.id,
              },
              state: {},
              scope: ['actions'],
            },
          });
        }
      }

      await taskManager.bulkSchedule(bulkScheduleOpts);
    }
  };
}

export function createEphemeralExecutionEnqueuerFunction({
  taskManager,
  actionTypeRegistry,
  preconfiguredActions,
}: CreateExecuteFunctionOptions): ExecutionEnqueuer<RunNowResult> {
  return async function execute(
    unsecuredSavedObjectsClient: SavedObjectsClientContract,
    { id, params, spaceId, source, consumer, apiKey, executionId }: ExecuteOptions
  ): Promise<RunNowResult> {
    const { action } = await getAction(unsecuredSavedObjectsClient, preconfiguredActions, id);
    validateCanConnectorBeUsed(action);

    const { actionTypeId } = action;
    if (!actionTypeRegistry.isActionExecutable(id, actionTypeId, { notifyUsage: true })) {
      actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
    }

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
      taskType: `actions:${action.actionTypeId}`,
      params: taskParams,
      state: {},
      scope: ['actions'],
    });
  };
}

function validateCanConnectorBeUsed(connector: PreConfiguredAction | RawAction) {
  const { name, isMissingSecrets } = connector;
  if (isMissingSecrets) {
    throw new Error(
      `Unable to execute action because no secrets are defined for the "${name}" connector.`
    );
  }
}

function getValidConnectors(
  connectors: GetConnectorsResult[],
  actionTypeRegistry: ActionTypeRegistryContract,
  logger: Logger
) {
  const validConnectors: GetConnectorsResult[] = [];
  for (const connector of connectors) {
    if (connector.connector.isMissingSecrets) {
      logger.error(
        `Unable to execute action because no secrets are defined for the "${connector.connector.name}" connector.`
      );
    } else {
      try {
        const { actionTypeId } = connector.connector;
        if (
          !actionTypeRegistry.isActionExecutable(connector.id, actionTypeId, {
            notifyUsage: true,
          })
        ) {
          actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
        }

        validConnectors.push(connector);
      } catch (err) {
        logger.error(
          `Unable to execute action for the "${connector.connector.name}" connector. - ${err.message}`
        );
      }
    }
  }

  if (validConnectors.length === 0) {
    throw new Error(`Unable to execute actions because connectors are invalid.`);
  }

  return validConnectors;
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

interface GetConnectorsResult {
  id: string;
  connector: PreConfiguredAction | RawAction;
  isPreconfigured: boolean;
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
