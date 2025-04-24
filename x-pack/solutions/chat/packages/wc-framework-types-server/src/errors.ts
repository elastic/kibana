/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionState } from './execution_state';

export type WorkflowExecutionErrorType =
  /**
   * Configuration of the node or the workflow is invalid,
   * and caused a runtime exception during execution
   */
  | 'invalidConfiguration'
  /**
   * The input provided to the node (e.g. interpolated values)
   * is invalid
   */
  | 'invalidParameter'
  /**
   * Workflow for a given ID was not found in the workflow provider.
   */
  | 'workflowNotFound'
  /**
   * A node type used in the workflow definition was not found.
   */
  | 'nodeTypeNotFound'
  /**
   * No tool was found for the specified tool ID in the tool provider.
   */
  | 'toolNotFound'
  /**
   * Default, fallback error.
   */
  | 'internalError';

export interface WorkflowExecutionErrorMeta {
  state?: WorkflowExecutionState;
}

export class WorkflowExecutionError extends Error {
  public readonly type: WorkflowExecutionErrorType;
  public readonly meta: WorkflowExecutionErrorMeta;

  constructor(message: string, type: WorkflowExecutionErrorType, meta: WorkflowExecutionErrorMeta) {
    super(message);
    this.type = type;
    this.meta = meta;
  }
}

export function isWorkflowExecutionError(error: Error): error is WorkflowExecutionError {
  return error instanceof WorkflowExecutionError;
}
