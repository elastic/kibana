/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionState } from '@kbn/wc-framework-types-server';

export const createInitialExecutionState = ({
  runId,
  workflowId,
}: {
  runId: string;
  workflowId: string;
}): WorkflowExecutionState => {
  return {
    runId,
    workflowId,
    rootWorkflowId: workflowId,
    callChain: [],
  };
};

export const enterNode = ({
  parent: { runId, workflowId, rootWorkflowId, callChain },
  nodeId,
}: {
  parent: WorkflowExecutionState;
  nodeId: string;
}): WorkflowExecutionState => {
  return {
    runId,
    workflowId,
    rootWorkflowId,
    stepId: nodeId,
    callChain: [...callChain, { type: 'node', id: nodeId }],
  };
};

export const enterWorkflow = ({
  parent: { runId, rootWorkflowId, callChain },
  workflowId,
}: {
  parent: WorkflowExecutionState;
  workflowId: string;
}): WorkflowExecutionState => {
  return {
    runId,
    workflowId,
    rootWorkflowId,
    callChain: [...callChain, { type: 'workflow', id: workflowId }],
  };
};
