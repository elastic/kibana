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
  PreConfiguredAction as PreconfiguredConnector,
} from './types';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from './constants/saved_objects';
import { ExecuteOptions as ActionExecutorOptions } from './lib/action_executor';
import { extractSavedObjectReferences, isSavedObjectExecutionSource } from './lib';

// This allowlist should only contain connector types that don't require API keys for
// execution.
const ALLOWED_CONNECTOR_TYPE_IDS = ['.email'];
interface CreateBulkUnsecuredExecuteFunctionOptions {
  taskManager: TaskManagerStartContract;
  connectorTypeRegistry: ConnectorTypeRegistryContract;
  preconfiguredConnectors: PreconfiguredConnector[];
}

export interface ExecuteOptions
  extends Pick<ActionExecutorOptions, 'params' | 'source' | 'relatedSavedObjects'> {
  id: string;
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
  preconfiguredConnectors,
}: CreateBulkUnsecuredExecuteFunctionOptions): BulkUnsecuredExecutionEnqueuer<void> {
  return async function execute(
    internalSavedObjectsRepository: ISavedObjectsRepository,
    actionsToExecute: ExecuteOptions[]
  ) {
    const connectorTypeIds: Record<string, string> = {};
    const connectorIds = [...new Set(actionsToExecute.map((action) => action.id))];

    const notPreconfiguredConnectors = connectorIds.filter(
      (connectorId) =>
        preconfiguredConnectors.find((connector) => connector.id === connectorId) == null
    );

    if (notPreconfiguredConnectors.length > 0) {
      throw new Error(
        `${notPreconfiguredConnectors.join(
          ','
        )} are not preconfigured connectors and can't be scheduled for unsecured actions execution`
      );
    }

    const connectors: PreconfiguredConnector[] = connectorIds
      .map((connectorId) =>
        preconfiguredConnectors.find((pConnector) => pConnector.id === connectorId)
      )
      .filter(Boolean) as PreconfiguredConnector[];

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
