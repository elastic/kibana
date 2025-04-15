/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  WorkflowDefinition,
  GraphWorkflowDefinition,
  WorkflowState,
  WorkflowRunEventHandler,
  RunWorkflowParams,
  RunWorkflowOutput,
  NodeFactoryBaseServices,
  WorkflowRunner,
  NodeFactoryContext,
  NodeDefinition,
  NodeEventReporter,
  ModelProvider,
  ToolProvider,
  RunNodeResult,
} from '@kbn/wc-framework-types-server';
import type { Logger, KibanaRequest } from '@kbn/core/server';
import type { createModelProviderFactory, ModelProviderFactory } from '../model_provider';
import type { ToolRegistry } from '../tools';
import type { NodeTypeRegistry } from '../nodes';
import type { WorkflowRegistry } from './registry';
import type { WorkflowRunnerInternalContext } from './types';
import {
  createNoopNodeEventReporter,
  createNodeEventReporter,
  createInitialState,
  interpolateNodeConfig,
} from './utils';

export interface WorkflowRunnerParams {
  /**
   * The definition of the step to run.
   */
  workflowDefinition: WorkflowDefinition;
  /**
   * The input passed to the workflow.
   */
  inputs: RunWorkflowParams['inputs'];
  /**
   * Internal context necessary to recurse into the workflow execution.
   */
  internalContext: WorkflowRunnerInternalContext;
}

type ScopedWorkflowRunner = (
  params: Pick<WorkflowRunnerParams, 'workflowDefinition' | 'inputs'>
) => Promise<RunWorkflowOutput>;

/**
 * Returns a step runner already scoped to the given context.
 */
export const createWorkflowRunner = (
  params: Pick<WorkflowRunnerParams, 'internalContext'>
): ScopedWorkflowRunner => {
  return (args) => {
    return runWorkflow({
      ...params,
      ...args,
    });
  };
};

export const runWorkflow = ({
  workflowDefinition,
  inputs,
  internalContext,
}: WorkflowRunnerParams) => {
  // TODO: validate input shape.

  const state = createInitialState({ inputs });

  // TODO: check for function workflows and handle them...

  // TODO: execute steps...
  const stepDefinitions = (workflowDefinition as GraphWorkflowDefinition).steps;
  for (let i = 0; i < stepDefinitions.length; i++) {
    const stepDefinition = stepDefinitions[i];

    const output = stepRunner({ stepDefinition, state, workflowId: workflowDefinition.id });
  }
};
