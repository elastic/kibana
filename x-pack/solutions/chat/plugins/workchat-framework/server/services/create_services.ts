/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, LoggerFactory } from '@kbn/core/server';
import type { WorkChatFrameworkPluginStartDependencies } from '../types';
import type { WorkChatFrameworkConfig } from '../config';
import { InternalSetupServices, InternalStartServices } from './types';
import { createWorkflowRegistry, createWorkflowService } from './workflow';
import {
  createModelProviderFactory,
  createWorkflowRunner,
  createNodeTypeRegistry,
  createToolRegistry,
} from './runner';

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

  const workflowService = createWorkflowService({
    registry: setupServices.workflowRegistry,
    logger: logger.get('workflow-service'),
    savedObjects: core.savedObjects,
    security: core.security,
  });

  return {
    workflowRunner,
    workflowService,
  };
}
