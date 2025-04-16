/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionState } from './execution_state';

export type WorkflowExecutionErrorType =
  | 'internalError'
  | 'workflowNotFound'
  | 'nodeTypeNotFound'
  | 'toolNotFound';

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
