/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Provider } from '../utils';
import type { NodeDefinition } from '../nodes';
import type { WorkflowState } from '../state';
import type { WorkflowDefinition } from './definition';
import type { RunWorkflowParams, RunWorkflowOutput } from './runner';

/**
 * Params for {@link ScopedRunner.runWorkflow}
 */
export interface ScopedRunnerRunWorkflowParams {
  /**
   * The definition of the workflow to run.
   */
  workflowDefinition: WorkflowDefinition;
  /**
   * The input passed to the workflow.
   */
  inputs: RunWorkflowParams['inputs'];
}

/**
 * Params for {@link ScopedRunner.runNode}
 */
export interface ScopedRunnerRunNodeParams {
  /**
   * The definition of the node to run.
   */
  nodeDefinition: NodeDefinition;
  /**
   * The state passed to the node.
   */
  state: WorkflowState;
}

export type ScopedRunnerRunWorkflowOutput = RunWorkflowOutput;

/**
 * An internal runner scoped to the current workflow execution context.
 * Can be used to have nodes execute workflows or node definitions as part of their execution.
 * E.g. for conditional nodes, parallel nodes or other...
 *
 * Exposed to node execution via the {@link NodeFactoryBaseServices}.
 */
export interface ScopedRunner {
  /**
   * Run a workflow definition, using a context bound to the current execution flow.
   */
  runWorkflow(params: ScopedRunnerRunWorkflowParams): Promise<ScopedRunnerRunWorkflowOutput>;
  /**
   * Run a node definition, using a context bound to the current execution flow.
   */
  runNode(params: ScopedRunnerRunNodeParams): Promise<void>;
}

export type ScopedWorkflowProvider = Provider<WorkflowDefinition>;
