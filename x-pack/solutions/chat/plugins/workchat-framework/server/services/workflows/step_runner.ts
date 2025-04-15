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

export interface RunStepParams {
  /**
   * The definition of the step to run
   */
  stepDefinition: NodeDefinition;
  /**
   * The input state to pass to the step.
   */
  state: WorkflowState;
  /**
   * ID of the workflow this step was executed from, used for tracing.
   */
  workflowId: string;
  /**
   * Internal context necessary to recurse into the workflow execution.
   */
  internalContext: WorkflowRunnerInternalContext;
}

type ScopedStepRunner = (
  params: Pick<RunStepParams, 'stepDefinition' | 'state' | 'workflowId'>
) => Promise<RunNodeResult>;

/**
 * Returns a step runner already scoped to the given context.
 */
export const createStepRunner = (
  params: Pick<RunStepParams, 'internalContext'>
): ScopedStepRunner => {
  return (args) => {
    return runStep({
      ...params,
      ...args,
    });
  };
};

const runStep = async ({ stepDefinition, state, workflowId, internalContext }: RunStepParams) => {
  const { nodeRegistry, eventHandler } = internalContext;
  // TODO: check if node type is registered

  const nodeType = nodeRegistry.get(stepDefinition.type);

  const nodeServices = createBaseNodeServices({ internalContext });
  // TODO: check / call nodeType.customServicesProvider if present

  const context: NodeFactoryContext = {
    nodeConfiguration: stepDefinition,
    services: nodeServices,
  };

  const nodeRunner = nodeType.factory(context);

  // interpolating the node config with the state
  const nodeInput = interpolateNodeConfig({
    config: stepDefinition.typeConfig,
    state,
  });

  // creating the event reporter
  const eventReporter = eventHandler
    ? createNodeEventReporter({
        onEvent: eventHandler,
        meta: {
          workflowId,
          nodeId: stepDefinition.id,
          nodeType: stepDefinition.type,
        },
      })
    : createNoopNodeEventReporter();

  // executing the node
  const output = await nodeRunner.run({
    input: nodeInput,
    state,
    eventReporter,
  });

  // writing output to state
  const stateOutputField = stepDefinition.output;
  state.set(stateOutputField, output);

  // end of node execution
  return output;
};

const createBaseNodeServices = ({
  internalContext: {
    logger,
    modelProvider,
    toolProvider,
    esClusterClient,
    nodeRegistry,
    workflowRegistry,
  },
}: {
  internalContext: WorkflowRunnerInternalContext;
}): NodeFactoryBaseServices => {
  return {
    logger: logger.get('workflow-runner'),
    modelProvider,
    toolProvider,
    esClusterClient,
    nodeRegistry,
    workflowRegistry,
  };
};
