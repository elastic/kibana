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
  NodeEventReporter,
} from '@kbn/wc-framework-types-server';
import type { Logger } from '@kbn/core/server';
import type { createModelProviderFactory, ModelProviderFactory } from '../model_provider';
import type { ToolRegistry } from '../tools';
import type { NodeTypeRegistry } from '../nodes';
import type { WorkflowRegistry } from './registry';
import {
  createNoopNodeEventReporter,
  createNodeEventReporter,
  createInitialState,
  interpolateNodeConfig,
} from './utils';

export interface GetWorkflowRunnerParams {
  logger: Logger;
  workflowRegistry: WorkflowRegistry;
  nodeRegistry: NodeTypeRegistry;
  modelProviderFactory: ModelProviderFactory;
  toolRegistry: ToolRegistry;
}

export const getWorkflowRunner = (params: GetWorkflowRunnerParams): WorkflowRunner => {
  const { workflowRegistry, nodeRegistry, modelProviderFactory, toolRegistry, logger } = params;

  const getWorkflowDefinition = async (
    workflowId: string
  ): Promise<WorkflowDefinition | undefined> => {
    if (workflowRegistry.has(workflowId)) {
      return workflowRegistry.get(workflowId);
    }
    return undefined;
  };

  const run: WorkflowRunner['run'] = async (options) => {
    const {
      id: workflowId,
      request,
      inputs,
      onEvent,
      defaultConnectorId,
      toolProvider: customToolProvider,
    } = options;

    const modelProvider = await modelProviderFactory({ request, defaultConnectorId });

    const baseNodeServices: NodeFactoryBaseServices = {
      logger: logger.get('workflow-runner'),
      modelProvider,
      toolProvider: customToolProvider ?? toolRegistry.asToolProvider(),
    };

    const workflowDefinition = await getWorkflowDefinition(workflowId);

    if (!workflowDefinition) {
      // TODO: structured error, see comment on WorkflowRunner
      throw new Error('workflow not found');
    }

    // TODO: validate input shape.

    // creating initial state
    const state = createInitialState({ inputs });

    const executeStep = async (stepId: number) => {
      const stepDefinition = (workflowDefinition as GraphWorkflowDefinition).steps[stepId];

      // TODO: check if node type is registered

      const nodeType = nodeRegistry.get(stepDefinition.type);

      // TODO: check / call nodeType.customServicesProvider if present
      const nodeServices = { ...baseNodeServices };

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
      const eventReporter = onEvent
        ? createNodeEventReporter({
            onEvent,
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
    };
  };

  return { run };
};
