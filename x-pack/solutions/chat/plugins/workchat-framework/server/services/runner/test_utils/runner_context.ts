/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { WorkflowRunnerInternalContext, InternalScopedRunner } from '../workflows/types';
import { createModelProviderMock, ModelProviderMock } from './models';
import { createToolProviderMock, ToolProviderMock } from './tools';
import { createExecutionState } from './execution_state';
import { createMockRegistry, MockRegistry } from './registries';

export type ScopedClusterClientMock = ReturnType<
  typeof elasticsearchServiceMock.createScopedClusterClient
>;

export type InternalScopedRunnerMock = jest.Mocked<InternalScopedRunner>;

export const createInternalScopedRunnerMock = (): InternalScopedRunnerMock => {
  return {
    runWorkflow: jest.fn(),
    runNode: jest.fn(),
  };
};

export interface MockedWorkflowRunnerInternalContext extends WorkflowRunnerInternalContext {
  logger: MockedLogger;
  modelProvider: ModelProviderMock;
  toolProvider: ToolProviderMock;
  esClusterClient: ScopedClusterClientMock;
  workflowRegistry: MockRegistry;
  nodeRegistry: MockRegistry;
  getRunner: () => InternalScopedRunnerMock;
}

export const createMockWorkflowRunnerInternalContext = (): MockedWorkflowRunnerInternalContext => {
  const logger = loggerMock.create();
  const request = httpServerMock.createKibanaRequest();
  const modelProvider = createModelProviderMock();
  const executionState = createExecutionState();
  const esClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  const toolProvider = createToolProviderMock();
  const workflowRegistry = createMockRegistry();
  const nodeRegistry = createMockRegistry();
  const runner = createInternalScopedRunnerMock();
  const eventHandler = jest.fn();

  return {
    request,
    logger,
    modelProvider,
    esClusterClient,
    executionState,
    toolProvider,
    workflowRegistry,
    nodeRegistry,
    getRunner: () => runner,
    eventHandler,
  };
};
