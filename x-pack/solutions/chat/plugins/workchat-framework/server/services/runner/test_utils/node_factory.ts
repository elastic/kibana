/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type {
  NodeFactoryBaseServices,
  ScopedRunner,
  ScopedNodeProvider,
} from '@kbn/wc-framework-types-server';
import { type ScopedWorkflowProvider } from '@kbn/wc-framework-types-server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ToolProviderMock } from './tools';
import { createToolProviderMock } from './tools';
import type { ModelProviderMock } from './models';
import { createModelProviderMock } from './models';

export interface MockedNodeFactoryBaseServices extends NodeFactoryBaseServices {
  logger: MockedLogger;
  modelProvider: ModelProviderMock;
  workflowRunner: ScopedRunnerMock;
  toolProvider: ToolProviderMock;
  esClusterClient: ScopedClusterClientMock;
  nodeRegistry: NodeProviderMock;
  workflowRegistry: WorkflowProviderMock;
}

export type ScopedRunnerMock = jest.Mocked<ScopedRunner>;
export type ScopedClusterClientMock = ReturnType<
  typeof elasticsearchServiceMock.createScopedClusterClient
>;
export type NodeProviderMock = jest.Mocked<ScopedNodeProvider>;
export type WorkflowProviderMock = jest.Mocked<ScopedWorkflowProvider>;

export const createMockProvider = () => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    getAllKeys: jest.fn(),
  };
};

const createScopedRunnerMock = (): ScopedRunnerMock => {
  return {
    runWorkflow: jest.fn(),
    runNode: jest.fn(),
  };
};

export const createMockFactoryServices = (): MockedNodeFactoryBaseServices => {
  const logger = loggerMock.create();
  const modelProvider = createModelProviderMock();
  const workflowRunner = createScopedRunnerMock();
  const toolProvider = createToolProviderMock();
  const esClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  const nodeRegistry = createMockProvider();
  const workflowRegistry = createMockProvider();

  return {
    logger,
    modelProvider,
    workflowRunner,
    toolProvider,
    esClusterClient,
    nodeRegistry,
    workflowRegistry,
  };
};
