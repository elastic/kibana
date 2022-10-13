/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository } from '@kbn/core/server';
import { UnsecuredActionsClientAccessRegistry } from './unsecured_actions_client_access_registry';
import {
  BulkUnsecuredExecutionEnqueuer,
  ExecuteOptions,
} from '../create_unsecured_execute_function';

export interface UnsecuredActionsClientOpts {
  unsecuredActionsClientAccessRegistry: UnsecuredActionsClientAccessRegistry;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  executionEnqueuer: BulkUnsecuredExecutionEnqueuer<void>;
}

export class UnsecuredActionsClient {
  private readonly unsecuredActionsClientAccessRegistry: UnsecuredActionsClientAccessRegistry;
  private readonly internalSavedObjectsRepository: ISavedObjectsRepository;
  private readonly executionEnqueuer: BulkUnsecuredExecutionEnqueuer<void>;

  constructor(params: UnsecuredActionsClientOpts) {
    this.unsecuredActionsClientAccessRegistry = params.unsecuredActionsClientAccessRegistry;
    this.executionEnqueuer = params.executionEnqueuer;
    this.internalSavedObjectsRepository = params.internalSavedObjectsRepository;
  }

  public async bulkEnqueueExecution(
    requesterId: string,
    actionsToExecute: ExecuteOptions[]
  ): Promise<void> {
    // Check that requesterId is allowed
    if (!this.unsecuredActionsClientAccessRegistry.has(requesterId)) {
      throw new Error(
        `${requesterId} feature is not registered for UnsecuredActionsClient access.`
      );
    }
    return this.executionEnqueuer(this.internalSavedObjectsRepository, actionsToExecute);
  }
}
