/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository } from '@kbn/core/server';
import {
  BulkUnsecuredExecutionEnqueuer,
  ExecuteOptions,
  ExecutionResponse,
} from '../create_unsecured_execute_function';
import { asNotificationExecutionSource } from '../lib';

const NOTIFICATION_REQUESTER_ID = 'notifications';

// allowlist for features wanting access to the unsecured actions client
// which allows actions to be enqueued for execution without a user request
const ALLOWED_REQUESTER_IDS = [
  NOTIFICATION_REQUESTER_ID,
  // For functional testing
  'functional_tester',
];

export interface UnsecuredActionsClientOpts {
  internalSavedObjectsRepository: ISavedObjectsRepository;
  executionEnqueuer: BulkUnsecuredExecutionEnqueuer<ExecutionResponse[]>;
}

export interface IUnsecuredActionsClient {
  bulkEnqueueExecution: (
    requesterId: string,
    actionsToExecute: ExecuteOptions[]
  ) => Promise<ExecutionResponse[]>;
}

export class UnsecuredActionsClient {
  private readonly internalSavedObjectsRepository: ISavedObjectsRepository;
  private readonly executionEnqueuer: BulkUnsecuredExecutionEnqueuer<ExecutionResponse[]>;

  constructor(params: UnsecuredActionsClientOpts) {
    this.executionEnqueuer = params.executionEnqueuer;
    this.internalSavedObjectsRepository = params.internalSavedObjectsRepository;
  }

  public async bulkEnqueueExecution(
    requesterId: string,
    actionsToExecute: ExecuteOptions[]
  ): Promise<ExecutionResponse[]> {
    // Check that requesterId is allowed
    if (!ALLOWED_REQUESTER_IDS.includes(requesterId)) {
      throw new Error(
        `"${requesterId}" feature is not allow-listed for UnsecuredActionsClient access.`
      );
    }
    // Inject source based on requesterId
    return this.executionEnqueuer(
      this.internalSavedObjectsRepository,
      this.injectSource(requesterId, actionsToExecute)
    );
  }

  private injectSource(requesterId: string, actionsToExecute: ExecuteOptions[]): ExecuteOptions[] {
    switch (requesterId) {
      case NOTIFICATION_REQUESTER_ID:
        return actionsToExecute.map((actionToExecute) => ({
          ...actionToExecute,
          source: asNotificationExecutionSource({
            requesterId,
            connectorId: actionToExecute.id,
          }),
        }));
      default:
        return actionsToExecute;
    }
  }
}
