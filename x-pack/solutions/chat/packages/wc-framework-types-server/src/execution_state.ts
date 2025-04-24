/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CallChain } from './call_chain';

/**
 * Meta containing all the info associated with the current execution
 */
export interface WorkflowExecutionState {
  /**
   * The id of this workflow execution run.
   */
  runId: string;
  /**
   * ID of the workflow that this error was thrown from.
   * In case of nested workflows, it will be the ID of the lowest level workflow.
   */
  workflowId: string;
  /**
   * ID of the root workflow, the workflow that was requested to be executed
   */
  rootWorkflowId: string;
  /**
   * If the error occurred during a step execution, this will be the step's ID.
   */
  stepId?: string;
  /**
   * The whole call chain for this error.
   */
  callChain: CallChain;
}
