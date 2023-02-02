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
} from '../create_unsecured_execute_function';

// allowlist for features wanting access to the unsecured actions client
// which allows actions to be enqueued for execution without a user request
const ALLOWED_REQUESTER_IDS = [
  'notifications',
  // For functional testing
  'functional_tester',
];

export interface UnsecuredActionsClientOpts {
  internalSavedObjectsRepository: ISavedObjectsRepository;
  executionEnqueuer: BulkUnsecuredExecutionEnqueuer<void>;
}

export interface IUnsecuredActionsClient {
  bulkEnqueueExecution: (requesterId: string, actionsToExecute: ExecuteOptions[]) => Promise<void>;
}

export class UnsecuredActionsClient {
  private readonly internalSavedObjectsRepository: ISavedObjectsRepository;
  private readonly executionEnqueuer: BulkUnsecuredExecutionEnqueuer<void>;

  constructor(params: UnsecuredActionsClientOpts) {
    this.executionEnqueuer = params.executionEnqueuer;
    this.internalSavedObjectsRepository = params.internalSavedObjectsRepository;
  }

  public async bulkEnqueueExecution(
    requesterId: string,
    actionsToExecute: ExecuteOptions[]
  ): Promise<void> {
    // Check that requesterId is allowed
    if (!ALLOWED_REQUESTER_IDS.includes(requesterId)) {
      throw new Error(
        `"${requesterId}" feature is not allow-listed for UnsecuredActionsClient access.`
      );
    }
    return this.executionEnqueuer(this.internalSavedObjectsRepository, actionsToExecute);
  }
}
