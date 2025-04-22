/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ScopedRunner,
  WorkflowRunEventHandler,
  ModelProvider,
  ToolProvider,
  WorkflowExecutionState,
} from '@kbn/wc-framework-types-server';
import type { Logger, KibanaRequest, IScopedClusterClient } from '@kbn/core/server';
import type { WorkflowRegistry } from '../../workflow';
import type { NodeTypeRegistry } from '../nodes';

/**
 * Internal context being passed down during workflow execution.
 * Necessary to be able to perform internal / nested step / workflow execution.
 */
export interface WorkflowRunnerInternalContext {
  request: KibanaRequest;
  logger: Logger;
  modelProvider: ModelProvider;
  workflowRegistry: WorkflowRegistry;
  nodeRegistry: NodeTypeRegistry;
  eventHandler: WorkflowRunEventHandler;
  toolProvider: ToolProvider;
  esClusterClient: IScopedClusterClient;
  executionState: WorkflowExecutionState;
  getRunner: () => InternalScopedRunner;
}

export type ScopedNodeRunnerFn = ScopedRunner['runNode'];
export type ScopedWorkflowRunnerFn = ScopedRunner['runWorkflow'];

// TODO: later we'll probably need more internal APIs to re-scope
export type InternalScopedRunner = ScopedRunner;
