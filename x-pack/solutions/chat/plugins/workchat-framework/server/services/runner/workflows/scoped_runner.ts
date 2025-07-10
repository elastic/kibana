/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowRunnerInternalContext, InternalScopedRunner } from './types';
import { createNodeRunner } from './run_node';
import { createWorkflowRunner } from './run_workflow';

export type WorkflowRunnerInternalContextWithoutRunner = Omit<
  WorkflowRunnerInternalContext,
  'getRunner'
>;

export const createInternalRunner = ({
  internalContext,
}: {
  internalContext: WorkflowRunnerInternalContextWithoutRunner;
}): InternalScopedRunner => {
  const contextWithInjectedRunner: WorkflowRunnerInternalContext = {
    ...internalContext,
    // using a stub implementation, will replace once the runner is created
    getRunner: () => {
      if (!runner) {
        throw new Error('accessing runner before end of init phase');
      }
      return runner;
    },
  };

  const runNode = createNodeRunner({ internalContext: contextWithInjectedRunner });
  const runWorkflow = createWorkflowRunner({ internalContext: contextWithInjectedRunner });

  const runner: InternalScopedRunner = {
    runNode,
    runWorkflow,
  };

  return runner;
};
