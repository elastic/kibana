/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionState } from '@kbn/wc-framework-types-server';

export const createExecutionState = (
  parts: Partial<WorkflowExecutionState> = {}
): WorkflowExecutionState => {
  return {
    runId: 'runId',
    workflowId: 'workflowId',
    rootWorkflowId: 'rootWorkflowId',
    callChain: [],
    ...parts,
  };
};
