/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, SavedObjectsBulkResponse } from '@kbn/core/server';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  ActionTypeRegistryContract as ConnectorTypeRegistryContract,
  InMemoryConnector,
} from './types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from './constants/saved_objects';
import { ExecuteOptions as ActionExecutorOptions } from './lib/action_executor';
import { extractSavedObjectReferences, isSavedObjectExecutionSource } from './lib';
import { ExecutionResponseItem, ExecutionResponseType } from './create_execute_function';
import { ActionsConfigurationUtilities } from './actions_config';
import { hasReachedTheQueuedActionsLimit } from './lib/has_reached_queued_actions_limit';

// This allowlist should only contain connector types that don't require API keys for
// execution.
const ALLOWED_CONNECTOR_TYPE_IDS = ['.email'];
interface CreateBulkUnsecuredExecuteFunctionOptions {
  taskManager: TaskManagerStartContract;
  connectorTypeRegistry: ConnectorTypeRegistryContract;
  inMemoryConnectors: InMemoryConnector[];
  configurationUtilities: ActionsConfigurationUtilities;
}

export interface ExecuteOptions
  extends Pick<ActionExecutorOptions, 'params' | 'source' | 'relatedSavedObjects'> {
  id: string;
}

export interface ExecutionResponse {
  errors: boolean;
  items: ExecutionResponseItem[];
}

interface ActionTaskParams
  extends Pick<ActionExecutorOptions, 'actionId' | 'params' | 'relatedSavedObjects'> {
  apiKey: string | null;
}

export type BulkUnsecuredExecutionEnqueuer<T> = (
  internalSavedObjectsRepository: ISavedObjectsRepository,
  actionsToExectute: ExecuteOptions[]
) => Promise<T>;

export function createBulkUnsecuredExecutionEnqueuerFunction({
  taskManager,
  connectorTypeRegistry,
  inMemoryConnectors,
  configurationUtilities,
}: CreateBulkUnsecuredExecuteFunctionOptions): BulkUnsecuredExecutionEnqueuer<ExecutionResponse> {
  return async function execute(
    internalSavedObjectsRepository: ISavedObjectsRepository,
    actionsToExecute: ExecuteOptions[]
  ) {
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

    const connectorTypeIds: Record<string, string> = {};
    const connectorIds = [...new Set(actionsToExecute.map((action) => action.id))];

    const notInMemoryConnectors = connectorIds.filter(
      (connectorId) => inMemoryConnectors.find((connector) => connector.id === connectorId) == null
    );

    if (notInMemoryConnectors.length > 0) {
      throw new Error(
        `${notInMemoryConnectors.join(
          ','
        )} are not in-memory connectors and can't be scheduled for unsecured actions execution`
      );
    }

    const connectors: InMemoryConnector[] = connectorIds
      .map((connectorId) =>
        inMemoryConnectors.find((inMemoryConnector) => inMemoryConnector.id === connectorId)
      )
      .filter(Boolean) as InMemoryConnector[];

    connectors.forEach((connector) => {
      const { id, actionTypeId } = connector;
      if (!connectorTypeRegistry.isActionExecutable(id, actionTypeId, { notifyUsage: true })) {
        connectorTypeRegistry.ensureActionTypeEnabled(actionTypeId);
      }

      if (!ALLOWED_CONNECTOR_TYPE_IDS.includes(actionTypeId)) {
        throw new Error(
          `${actionTypeId} actions cannot be scheduled for unsecured actions execution`
        );
      }

      connectorTypeIds[id] = actionTypeId;
    });

    const actions = actionsToExecute.map((actionToExecute) => {
      // Get saved object references from action ID and relatedSavedObjects
      const { references, relatedSavedObjectWithRefs } = extractSavedObjectReferences(
        actionToExecute.id,
        true,
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

      return {
        type: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
        attributes: {
          actionId: actionToExecute.id,
          params: actionToExecute.params,
          apiKey: null,
          relatedSavedObjects: relatedSavedObjectWithRefs,
          ...(actionToExecute.source ? { source: actionToExecute.source.type } : {}),
        },
        references: taskReferences,
      };
    });
    const actionTaskParamsRecords: SavedObjectsBulkResponse<ActionTaskParams> =
      await internalSavedObjectsRepository.bulkCreate(actions);

    const taskInstances = actionTaskParamsRecords.saved_objects.map((so) => {
      const actionId = so.attributes.actionId;
      return {
        taskType: `actions:${connectorTypeIds[actionId]}`,
        params: {
          spaceId: 'default',
          actionTaskParamsId: so.id,
        },
        state: {},
        scope: ['actions'],
      };
    });
    await taskManager.bulkSchedule(taskInstances);

    return {
      errors: actionsOverLimit.length > 0,
      items: actionsToExecute
        .map((a) => ({
          id: a.id,
          response: ExecutionResponseType.SUCCESS,
          actionTypeId: connectorTypeIds[a.id],
        }))
        .concat(
          actionsOverLimit.map((a) => ({
            id: a.id,
            response: ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR,
            actionTypeId: connectorTypeIds[a.id],
          }))
        ),
    };
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
