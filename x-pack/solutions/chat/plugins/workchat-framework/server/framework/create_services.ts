/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowRunner } from '@kbn/wc-framework-types-server';
import type { CoreStart, LoggerFactory } from '@kbn/core/server';
import type { WorkChatFrameworkPluginStartDependencies } from '../types';
import type { WorkChatFrameworkConfig } from '../config';
import { createModelProviderFactory } from './model_provider';
import { WorkflowRegistry, createWorkflowRegistry, createWorkflowRunner } from './workflows';
import { NodeTypeRegistry, createNodeTypeRegistry } from './nodes';
import { ToolRegistry, createToolRegistry } from './tools';

export interface InternalSetupServices {
  workflowRegistry: WorkflowRegistry;
  nodeRegistry: NodeTypeRegistry;
  toolRegistry: ToolRegistry;
}

export const createSetupServices = (): InternalSetupServices => {
  const workflowRegistry = createWorkflowRegistry();
  const nodeRegistry = createNodeTypeRegistry();
  const toolRegistry = createToolRegistry();

  return {
    workflowRegistry,
    nodeRegistry,
    toolRegistry,
  };
};

export interface InternalStartServices {
  workflowRunner: WorkflowRunner;
}

interface CreateServicesParams {
  core: CoreStart;
  config: WorkChatFrameworkConfig;
  logger: LoggerFactory;
  pluginsDependencies: WorkChatFrameworkPluginStartDependencies;
  setupServices: InternalSetupServices;
}

export function createStartServices({
  core,
  config,
  logger,
  pluginsDependencies,
  setupServices,
}: CreateServicesParams): InternalStartServices {
  const { inference, actions } = pluginsDependencies;
  const modelProviderFactory = createModelProviderFactory({ inference, actions });

  const workflowRunner = createWorkflowRunner({
    logger: logger.get('workflow-runner'),
    core,
    workflowRegistry: setupServices.workflowRegistry,
    nodeRegistry: setupServices.nodeRegistry,
    toolRegistry: setupServices.toolRegistry,
    modelProviderFactory,
  });

  return {
    workflowRunner,
  };
}
