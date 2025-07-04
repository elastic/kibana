/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import { NodeTypeDefinition, NodeRunner } from '@kbn/wc-framework-types-server';

export type MockedNodeTypeDefinition = NodeTypeDefinition<any> & {
  factory: jest.MockedFunction<() => MockedNodeRunner>;
};

export type MockedNodeRunner = NodeRunner & {
  run: jest.Mock;
};

export const getMockedPromptNodeTypeDefinition = (): MockedNodeTypeDefinition => {
  const runner: MockedNodeRunner = {
    run: jest.fn(),
  };

  return {
    id: NodeType.prompt,
    name: 'Prompt',
    description: 'Mocked prompt node type',
    factory: jest.fn().mockImplementation(() => {
      return runner;
    }),
  };
};
