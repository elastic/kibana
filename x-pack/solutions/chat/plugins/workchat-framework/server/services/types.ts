/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowRunner } from '@kbn/wc-framework-types-server';
import type { WorkflowRegistry, WorkflowService } from './workflow';
import type { NodeTypeRegistry } from './runner/nodes';
import type { ToolRegistry } from './runner/tools';

export interface InternalSetupServices {
  workflowRegistry: WorkflowRegistry;
  nodeRegistry: NodeTypeRegistry;
  toolRegistry: ToolRegistry;
}

export interface InternalStartServices {
  workflowService: WorkflowService;
  workflowRunner: WorkflowRunner;
}
