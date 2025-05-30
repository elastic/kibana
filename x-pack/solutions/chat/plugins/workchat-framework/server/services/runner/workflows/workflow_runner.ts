/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type WorkflowDefinition,
  type WorkflowRunner,
  WorkflowExecutionError,
} from '@kbn/wc-framework-types-server';
import type { Logger, CoreStart } from '@kbn/core/server';
import type { WorkflowRegistry } from '../../workflow';
import type { ModelProviderFactory } from '../model_provider';
import type { ToolRegistry } from '../tools';
import type { NodeTypeRegistry } from '../nodes';
import {
  createInternalRunner,
  type WorkflowRunnerInternalContextWithoutRunner,
} from './scoped_runner';
import { createInitialExecutionState, combineToolProviders } from './utils';

export interface CreateWorkflowRunnerParams {
  logger: Logger;
  core: CoreStart;
  workflowRegistry: WorkflowRegistry;
  nodeRegistry: NodeTypeRegistry;
  modelProviderFactory: ModelProviderFactory;
  toolRegistry: ToolRegistry;
}

export const createWorkflowRunner = (params: CreateWorkflowRunnerParams): WorkflowRunner => {
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

    const runId = uuidv4();
    const executionState = createInitialExecutionState({ runId, workflowId });

    const workflowDefinition = await getWorkflowDefinition(workflowId);
    if (!workflowDefinition) {
      throw new WorkflowExecutionError(
        `Workflow with id [${workflowId}] not found in registry`,
        'workflowNotFound',
        { state: executionState }
      );
    }

    const modelProvider = await modelProviderFactory({ request, defaultConnectorId });

    const internalContext: WorkflowRunnerInternalContextWithoutRunner = {
      logger,
      request,
      modelProvider,
      workflowRegistry,
      nodeRegistry,
      toolProvider: customToolProvider
        ? combineToolProviders(customToolProvider, toolRegistry.asToolProvider())
        : toolRegistry.asToolProvider(),
      esClusterClient: elasticsearch.client.asScoped(request),
      // TODO: we probably need to always have a default one, for internal telemetry, and combine with onEvent if present
      eventHandler: onEvent ?? (() => undefined),
      executionState,
    };

    const scopedRunner = createInternalRunner({ internalContext });

    return scopedRunner.runWorkflow({ workflowDefinition, inputs });
  };

  return { run };
};
