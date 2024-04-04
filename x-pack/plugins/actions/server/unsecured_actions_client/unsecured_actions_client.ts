/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { IClusterClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import {
  BulkUnsecuredExecutionEnqueuer,
  ExecuteOptions,
  ExecutionResponse,
} from '../create_unsecured_execute_function';
import {
  ActionExecutorContract,
  asNotificationExecutionSource,
  type RelatedSavedObjects,
} from '../lib';
import { ActionTypeExecutorResult, InMemoryConnector } from '../types';
import { asBackgroundTaskExecutionSource } from '../lib/action_execution_source';
import { ConnectorWithExtraFindData } from '../application/connector/types';
import { getAllUnsecured } from '../application/connector/methods/get_all/get_all';

// requests from the notification service (for system notification)
const NOTIFICATION_REQUESTER_ID = 'notifications';

// requests from background tasks (primarily for EDR)
const BACKGROUND_TASK_REQUESTER_ID = 'background_task';

// allowlist for features wanting access to the unsecured actions client
// which allows actions to be enqueued for execution without a user request
const ALLOWED_REQUESTER_IDS = [
  NOTIFICATION_REQUESTER_ID,
  BACKGROUND_TASK_REQUESTER_ID,
  // For functional testing
  'functional_tester',
];

export interface UnsecuredActionsClientOpts {
  actionExecutor: ActionExecutorContract;
  clusterClient: IClusterClient;
  executionEnqueuer: BulkUnsecuredExecutionEnqueuer<ExecutionResponse>;
  inMemoryConnectors: InMemoryConnector[];
  internalSavedObjectsRepository: ISavedObjectsRepository;
  kibanaIndices: string[];
  logger: Logger;
}

type UnsecuredExecuteOptions = Omit<ExecuteOptions, 'source'> & {
  spaceId: string;
  requesterId: string;
};

export interface IUnsecuredActionsClient {
  getAll: (spaceId: string) => Promise<ConnectorWithExtraFindData[]>;
  execute: (opts: UnsecuredExecuteOptions) => Promise<ActionTypeExecutorResult<unknown>>;
  bulkEnqueueExecution: (
    requesterId: string,
    actionsToExecute: ExecuteOptions[]
  ) => Promise<ExecutionResponse>;
}

export class UnsecuredActionsClient {
  constructor(private readonly opts: UnsecuredActionsClientOpts) {}

  public async execute({
    requesterId,
    id,
    params,
    relatedSavedObjects,
    spaceId,
  }: UnsecuredExecuteOptions) {
    // Check that requesterId is allowed
    if (!ALLOWED_REQUESTER_IDS.includes(requesterId)) {
      throw new Error(
        `"${requesterId}" feature is not allow-listed for UnsecuredActionsClient access.`
      );
    }

    if (!relatedSavedObjects) {
      this.opts.logger.warn(
        `Calling "execute" in UnsecuredActionsClient without any relatedSavedObjects data. Consider including this for traceability.`
      );
    }

    const source = this.getSourceFromRequester(requesterId, id, relatedSavedObjects);

    return this.opts.actionExecutor.executeUnsecured({
      actionExecutionId: uuidv4(),
      actionId: id,
      params,
      relatedSavedObjects,
      spaceId,
      ...source,
    });
  }

  public async bulkEnqueueExecution(
    requesterId: string,
    actionsToExecute: ExecuteOptions[]
  ): Promise<ExecutionResponse> {
    // Check that requesterId is allowed
    if (!ALLOWED_REQUESTER_IDS.includes(requesterId)) {
      throw new Error(
        `"${requesterId}" feature is not allow-listed for UnsecuredActionsClient access.`
      );
    }

    // Inject source based on requesterId
    const actionsToEnqueue = actionsToExecute.map((action) => {
      const source = this.getSourceFromRequester(
        requesterId,
        action.id,
        action.relatedSavedObjects
      );
      return {
        ...action,
        ...source,
      };
    });
    return this.opts.executionEnqueuer(this.opts.internalSavedObjectsRepository, actionsToEnqueue);
  }

  public async getAll(spaceId: string): Promise<ConnectorWithExtraFindData[]> {
    return getAllUnsecured({
      esClient: this.opts.clusterClient.asInternalUser,
      inMemoryConnectors: this.opts.inMemoryConnectors,
      kibanaIndices: this.opts.kibanaIndices,
      logger: this.opts.logger,
      internalSavedObjectsRepository: this.opts.internalSavedObjectsRepository,
      spaceId,
    });
  }

  private getSourceFromRequester(
    requesterId: string,
    actionId: string,
    relatedSavedObjects?: RelatedSavedObjects
  ) {
    switch (requesterId) {
      case NOTIFICATION_REQUESTER_ID:
        return {
          source: asNotificationExecutionSource({
            requesterId,
            connectorId: actionId,
          }),
        };
      case BACKGROUND_TASK_REQUESTER_ID:
        const taskSO = (relatedSavedObjects ?? []).find((rso) => rso.type === 'task');
        if (taskSO) {
          return {
            source: asBackgroundTaskExecutionSource({
              taskId: taskSO.id,
              taskType: taskSO.typeId ?? 'unknown',
            }),
          };
        }
        return {};
      default:
        return {};
    }
  }
}
