/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import { GraphWorkflowDefinition } from '@kbn/wc-framework-types-server';
import type { ScopedWorkflowRunnerFn } from './types';
import {
  createMockWorkflowRunnerInternalContext,
  getMockedPromptNodeTypeDefinition,
  MockedWorkflowRunnerInternalContext,
  MockedNodeTypeDefinition,
} from '../test_utils';
import { createWorkflowRunner } from './run_workflow';

describe('runNode', () => {
  let context: MockedWorkflowRunnerInternalContext;
  let runner: ScopedWorkflowRunnerFn;
  let mockedPromptTypeDef: MockedNodeTypeDefinition;

  beforeEach(() => {
    context = createMockWorkflowRunnerInternalContext();
    runner = createWorkflowRunner({ internalContext: context });

    // register node type for tests
    mockedPromptTypeDef = getMockedPromptNodeTypeDefinition();
    context.nodeRegistry.register(mockedPromptTypeDef);
    mockedPromptTypeDef.factory.mockClear();
  });

  it('runs the workflow definition', async () => {
    const workflowDefinition: GraphWorkflowDefinition = {
      id: 'id',
      name: 'Test workflow',
      inputs: [],
      outputs: [],
      type: 'graph',
      steps: [
        {
          id: 'id',
          type: NodeType.prompt,
          configuration: {
            prompt: 'foo',
            output: 'bar',
          },
        },
      ],
    };

    const result = await runner({
      workflowDefinition,
      inputs: {
        foo: 'bar',
      },
    });

    expect(result).toEqual({
      runId: expect.any(String),
      output: expect.any(Object),
    });
  });
});
