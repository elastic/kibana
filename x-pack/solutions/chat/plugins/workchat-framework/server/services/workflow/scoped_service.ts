/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowDefinition } from '@kbn/wc-framework-types-server';
import type { WorkflowClient } from './client';
import type { WorkflowRegistry } from './registry';

/**
 * Workflow service scoped to a given user/request.
 */
export interface ScopedWorkflowService {
  /**
   * Retrieve a workflow based on its ID.
   * Will first search against built-in workflows, then against persistent workflows.
   */
  get(id: string): Promise<WorkflowDefinition>;
}

export interface ScopedWorkflowServiceArgs {
  client: WorkflowClient;
  registry: WorkflowRegistry;
}

export class ScopedWorkflowServiceImpl implements ScopedWorkflowService {
  private client: WorkflowClient;
  private registry: WorkflowRegistry;

  constructor({ client, registry }: ScopedWorkflowServiceArgs) {
    this.client = client;
    this.registry = registry;
  }

  async get(id: string): Promise<WorkflowDefinition> {
    if (this.registry.has(id)) {
      return this.registry.get(id);
    }
    return this.client.get({ workflowId: id });
  }
}
