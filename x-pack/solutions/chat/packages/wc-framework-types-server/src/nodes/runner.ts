/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowState } from '../state';
import type { WorkflowExecutionState } from '../execution_state';
import type { NodeEventReporter } from './event_reporter';

export type DefaultNodeRunnerInput = Record<string, unknown>;

/**
 * Param type for {@link NodeRunner.run}
 */
export interface RunNodeParams<Input = DefaultNodeRunnerInput> {
  /**
   * raw input (configuration for this node, as described in the configuration
   */
  input: Input;

  /**
   * Global state for this run.
   *
   * Usually, nodes don't need to access this directly, as the node's configuration
   * should be sufficient for the framework to inject the right properties,
   * but the state is still exposed to the nodes during execution
   */
  state: WorkflowState;

  /**
   * Event reporter for this run.
   */
  eventReporter: NodeEventReporter;

  /**
   * The current workflow execute state.
   * Can be used when manually throwing errors from the node run handler.
   */
  executionState: WorkflowExecutionState;
}

/**
 * Represents an instance of a node runner.
 */
export interface NodeRunner<Input = DefaultNodeRunnerInput> {
  /**
   * Run the node with the provided inputs.
   */
  run: (params: RunNodeParams<Input>) => Promise<void>;
}
