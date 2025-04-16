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
import { createInitialState } from './utils';

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
  // TODO: validate input shape.

  const state = createInitialState({ inputs });

  // TODO: check for function workflows and handle them...

  // TODO: execute steps...
  const stepDefinitions = (workflowDefinition as GraphWorkflowDefinition).steps;
  for (let i = 0; i < stepDefinitions.length; i++) {
    const stepDefinition = stepDefinitions[i];

    const output = stepRunner({ stepDefinition, state, workflowId: workflowDefinition.id });
  }

  // TODO: return type
  return {
    runId: 'foo',
    output: 'something',
  };
};
