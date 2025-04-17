/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tool } from '@kbn/wc-framework-types-server';

export type MockedTool = Tool & {
  handler: jest.MockedFn<Tool['handler']>;
};

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
