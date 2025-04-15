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
} from '@kbn/wc-framework-types-server';
import type { Logger, KibanaRequest, IScopedClusterClient, CoreStart } from '@kbn/core/server';
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
import { createStepRunner } from './step_runner';
import { createWorkflowRunner } from './workflow_runner';

export interface GetWorkflowRunnerParams {
  logger: Logger;
  workflowRegistry: WorkflowRegistry;
  nodeRegistry: NodeTypeRegistry;
  modelProviderFactory: ModelProviderFactory;
  toolRegistry: ToolRegistry;
  core: CoreStart;
}

export const getWorkflowRunner = (params: GetWorkflowRunnerParams): WorkflowRunner => {
  const {
    workflowRegistry,
    nodeRegistry,
    modelProviderFactory,
    toolRegistry,
    logger,
    core: { elasticsearch },
  } = params;

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

    const internalContext: WorkflowRunnerInternalContext = {
      logger,
      request,
      modelProvider,
      workflowRegistry, // TODO: allow override?
      nodeRegistry,
      toolProvider: customToolProvider ?? toolRegistry.asToolProvider(),
      esClusterClient: elasticsearch.client.asScoped(request),
      eventHandler: onEvent, // TODO: we probably want to always have a default one, dispatching..
    };

    const workflowDefinition = await getWorkflowDefinition(workflowId);

    if (!workflowDefinition) {
      // TODO: structured error, see comment on WorkflowRunner
      throw new Error('workflow not found');
    }

    const stepRunner = createStepRunner({ internalContext });
    const workflowRunner = createWorkflowRunner({ internalContext });

    return workflowRunner({ workflowDefinition, inputs });
  };

  return { run };
};
