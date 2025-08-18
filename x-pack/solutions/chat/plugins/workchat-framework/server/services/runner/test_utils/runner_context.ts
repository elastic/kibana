/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { WorkflowRunnerInternalContext, InternalScopedRunner } from '../workflows/types';
import type { ModelProviderMock } from './models';
import { createModelProviderMock } from './models';
import type { ToolProviderMock } from './tools';
import { createToolProviderMock } from './tools';
import { createExecutionState } from './execution_state';
import type { MockRegistry } from './registries';
import { createMockRegistry } from './registries';

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
