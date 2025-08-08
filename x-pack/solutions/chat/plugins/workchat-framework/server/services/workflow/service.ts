/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsServiceStart,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import { workflowSoTypeName } from '../../saved_objects';
import { WorkflowRegistry } from './registry';
import { ScopedWorkflowService, ScopedWorkflowServiceImpl } from './scoped_service';
import { WorkflowClientImpl } from './client';

export interface WorkflowService {
  asScoped(opts: { request: KibanaRequest }): Promise<ScopedWorkflowService>;
}

interface WorkflowServiceArgs {
  registry: WorkflowRegistry;
  logger: Logger;
  savedObjects: SavedObjectsServiceStart;
  security: SecurityServiceStart;
}

export const createWorkflowService = (args: WorkflowServiceArgs): WorkflowService => {
  return new WorkflowServiceImpl(args);
};

export class WorkflowServiceImpl implements WorkflowService {
  private readonly savedObjects: SavedObjectsServiceStart;
  private readonly security: SecurityServiceStart;
  private readonly logger: Logger;
  private readonly registry: WorkflowRegistry;

  constructor({ registry, savedObjects, security, logger }: WorkflowServiceArgs) {
    this.savedObjects = savedObjects;
    this.security = security;
    this.logger = logger;
    this.registry = registry;
  }

  async asScoped({ request }: { request: KibanaRequest }): Promise<ScopedWorkflowService> {
    const user = this.security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('No user bound to the provided request');
    }

    const soClient = this.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [workflowSoTypeName],
    });

    const client = new WorkflowClientImpl({
      logger: this.logger.get('client'),
      client: soClient,
      user: { id: user.profile_uid!, username: user.username },
    });

    return new ScopedWorkflowServiceImpl({
      client,
      registry: this.registry,
    });
  }
}
