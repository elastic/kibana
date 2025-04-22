/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import { NodeDefinition } from '@kbn/wc-framework-types-server';
import type { ScopedNodeRunnerFn } from './types';
import {
  createMockWorkflowRunnerInternalContext,
  createMockedState,
  getMockedPromptNodeTypeDefinition,
  MockedWorkflowRunnerInternalContext,
  MockedState,
  MockedNodeTypeDefinition,
  MockedNodeRunner,
} from '../test_utils';
import { createNodeRunner } from './run_node';

describe('runNode', () => {
  let context: MockedWorkflowRunnerInternalContext;
  let state: MockedState;
  let runner: ScopedNodeRunnerFn;
  let mockedPromptTypeDef: MockedNodeTypeDefinition;
  let promptNodeRunner: MockedNodeRunner;

  beforeEach(() => {
    state = createMockedState();
    context = createMockWorkflowRunnerInternalContext();
    runner = createNodeRunner({ internalContext: context });

    // register node type for tests
    mockedPromptTypeDef = getMockedPromptNodeTypeDefinition();
    context.nodeRegistry.register(mockedPromptTypeDef);
    promptNodeRunner = mockedPromptTypeDef.factory();
    mockedPromptTypeDef.factory.mockClear();
  });

  it('instantiate the factory and calls the runner', async () => {
    const nodeDefinition: NodeDefinition = {
      id: 'id',
      type: NodeType.prompt,
      configuration: {
        prompt: 'foo',
        output: 'bar',
      },
    };

    await runner({
      nodeDefinition,
      state,
    });

    expect(mockedPromptTypeDef.factory).toHaveBeenCalledTimes(1);
    expect(promptNodeRunner.run).toHaveBeenCalledTimes(1);
  });
});
