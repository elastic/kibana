/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tool, ToolProvider } from '@kbn/wc-framework-types-server';

export type MockedTool = Tool & {
  handler: jest.MockedFn<Tool['handler']>;
};

export type ToolProviderMock = jest.Mocked<ToolProvider>;

export const createMockedTool = (parts: Partial<Tool> = {}): MockedTool => {
  return {
    id: 'toolId',
    name: 'toolName',
    description: 'toolDescription',
    schema: {},
    ...parts,
    handler: jest.fn(),
  };
};

export const createToolProviderMock = (): ToolProviderMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
  };
};
