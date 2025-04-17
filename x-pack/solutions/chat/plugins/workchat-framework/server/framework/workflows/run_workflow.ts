/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GraphWorkflowDefinition,
  ScopedRunnerRunWorkflowParams,
  ScopedRunnerRunWorkflowOutput,
} from '@kbn/wc-framework-types-server';
import type { WorkflowRunnerInternalContext, ScopedWorkflowRunnerFn } from './types';
import { createInitialState, enterWorkflow } from './utils';

export type RunWorkflowParams = ScopedRunnerRunWorkflowParams & {
  internalContext: WorkflowRunnerInternalContext;
};

/**
 * Returns a step runner already scoped to the given context.
 */
export const createWorkflowRunner = (params: {
  internalContext: WorkflowRunnerInternalContext;
}): ScopedWorkflowRunnerFn => {
  return (args) => {
    return runWorkflow({
      ...params,
      ...args,
    });
  };
};

export const runWorkflow = async ({
  workflowDefinition,
  inputs,
  internalContext,
}: RunWorkflowParams): Promise<ScopedRunnerRunWorkflowOutput> => {
  // update the execution state - context is already a copy, it's safe to reference
  internalContext.executionState = enterWorkflow({
    parent: internalContext.executionState,
    workflowId: workflowDefinition.id,
  });

  const internalRunner = internalContext.getRunner();

  // TODO: validate input shape.

  const state = createInitialState({ inputs });

  // TODO: check for function workflows and handle them...

  const stepDefinitions = (workflowDefinition as GraphWorkflowDefinition).steps;
  for (let i = 0; i < stepDefinitions.length; i++) {
    const nodeDefinition = stepDefinitions[i];

    await internalRunner.runNode({
      nodeDefinition,
      state,
    });
  }

  // TODO: probably need to improve the logic?
  const output: Record<string, unknown> = {};
  workflowDefinition.outputs.forEach((outputDef) => {
    output[outputDef.name] = state.get(outputDef.ref);
  });

  return {
    runId: internalContext.executionState.runId,
    output,
  };
};
