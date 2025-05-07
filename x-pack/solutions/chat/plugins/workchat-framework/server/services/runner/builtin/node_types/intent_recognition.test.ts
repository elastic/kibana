/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import {
  WorkflowExecutionError,
  type NodeRunnerFactory,
  type NodeFactoryContext,
  type IntentRecognitionNodeConfigType,
  type BuiltInNodeDefinition,
  type RunNodeParams,
  type WorkflowExecutionState,
} from '@kbn/wc-framework-types-server';
import {
  type IntentRecognitionConditionBranch,
  type IntentRecognitionDefaultBranch,
} from '@kbn/wc-framework-types-server/src/nodes/node_type_configs';
import { getIntentRecognitionNodeTypeDefinition } from './intent_recognition';
import * as utils from '../../utils';
import {
  createMockFactoryServices,
  createMockedState,
  createMockedNodeEventReporter,
  createExecutionState,
  MockedNodeFactoryBaseServices,
  MockedState,
  NodeEventReporterMock,
  createMockedModel,
  MockedModel,
} from '../../test_utils';

jest.mock('../../utils', () => ({
  runNodeSequence: jest.fn(),
}));
const runNodeSequenceMock = utils.runNodeSequence as jest.Mock;

describe('Node type: intentRecognition', () => {
  let factory: NodeRunnerFactory<IntentRecognitionNodeConfigType>;
  let services: MockedNodeFactoryBaseServices;
  let state: MockedState;
  let eventReporter: NodeEventReporterMock;
  let executionState: WorkflowExecutionState;
  let model: MockedModel;
  let structuredOutputModel: MockedModel;

  const defaultBranch: IntentRecognitionDefaultBranch = {
    default: true,
    steps: [
      {
        id: 'default-step',
        type: NodeType.prompt,
        configuration: { prompt: 'default p', output: 'default o' },
      },
    ],
  };
  const branch1: IntentRecognitionConditionBranch = {
    id: 'INTENTION_1',
    condition: 'Condition 1 for {topic}',
    steps: [
      {
        id: 'branch1-step',
        type: NodeType.prompt,
        configuration: { prompt: 'branch1 p', output: 'branch1 o' },
      },
    ],
  };
  const branch2: IntentRecognitionConditionBranch = {
    id: 'INTENTION_2',
    condition: 'Condition 2',
    steps: [
      {
        id: 'branch2-step',
        type: NodeType.toolExecution,
        configuration: { toolId: 't1', toolArguments: {}, parseResponse: false, output: 'o2' },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    services = createMockFactoryServices();
    const definition = getIntentRecognitionNodeTypeDefinition();
    factory = definition.factory;
    state = createMockedState();
    eventReporter = createMockedNodeEventReporter();
    executionState = createExecutionState();

    model = createMockedModel();
    structuredOutputModel = createMockedModel();
    model.withStructuredOutput = jest.fn().mockReturnValue(structuredOutputModel);
    services.modelProvider.getDefaultModel.mockReturnValue(model);

    structuredOutputModel.invoke.mockResolvedValue({
      intention: 'INTENTION_1',
      reasoning: 'mock reasoning',
    } as any);
  });

  const getRunParams = (
    input: IntentRecognitionNodeConfigType
  ): RunNodeParams<IntentRecognitionNodeConfigType> => {
    return { input, state, eventReporter, executionState };
  };

  const createDefinition = (
    config: IntentRecognitionNodeConfigType
  ): BuiltInNodeDefinition<NodeType.intentRecognition> => {
    return {
      id: 'test-intent-node',
      type: NodeType.intentRecognition,
      configuration: config,
    };
  };

  it('throws error if not exactly one default branch exists', async () => {
    const nodeConfigWithoutDefault: IntentRecognitionNodeConfigType = {
      prompt: 'User message',
      branches: [branch1],
    };
    const nodeConfigWithTwoDefaults: IntentRecognitionNodeConfigType = {
      prompt: 'User message',
      branches: [defaultBranch, defaultBranch],
    };

    const definition = createDefinition(nodeConfigWithoutDefault);
    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);

    await expect(runner.run(getRunParams(nodeConfigWithoutDefault))).rejects.toThrow(
      'intentRecognition nodes must have exactly one default branch, found 0'
    );
    await expect(runner.run(getRunParams(nodeConfigWithTwoDefaults))).rejects.toThrow(
      'intentRecognition nodes must have exactly one default branch, found 2'
    );
  });

  it('invokes model with correct prompt and structure', async () => {
    const nodeConfig: IntentRecognitionNodeConfigType = {
      prompt: 'Classify: {userInput}',
      branches: [branch1, branch2, defaultBranch],
    };
    state.set('topic', 'Kibana');
    state.set('userInput', 'Tell me about Kibana features.');

    const definition = createDefinition(nodeConfig);
    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);

    await runner.run(getRunParams(nodeConfig));

    expect(model.withStructuredOutput).toHaveBeenCalledTimes(1);
    expect(structuredOutputModel.invoke).toHaveBeenCalledTimes(1);
    const systemPromptMatcher = expect.stringContaining(
      `1. INTENTION_1 — Condition 1 for Kibana.\n2. INTENTION_2 — Condition 2.\n3. DEFAULT — The user message doesn't match any of the above.`
    );
    const userPromptMatcher = 'Classify: Tell me about Kibana features.';
    expect(structuredOutputModel.invoke).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.arrayContaining(['system', systemPromptMatcher]),
        expect.arrayContaining(['user', userPromptMatcher]),
      ])
    );
  });

  it('runs the sequence for the selected intention branch', async () => {
    // Mock model to return INTENTION_2
    structuredOutputModel.invoke.mockResolvedValue({
      intention: 'INTENTION_2',
      reasoning: 'branch 2 selected',
    } as any);
    const nodeConfig: IntentRecognitionNodeConfigType = {
      prompt: 'User message',
      branches: [branch1, branch2, defaultBranch],
    };
    const definition = createDefinition(nodeConfig);
    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);

    await runner.run(getRunParams(nodeConfig));

    expect(runNodeSequenceMock).toHaveBeenCalledTimes(1);
    expect(runNodeSequenceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sequence: branch2.steps,
        runner: services.workflowRunner,
        state,
      })
    );
  });

  it('runs the sequence for the default branch', async () => {
    // Mock model to return DEFAULT
    structuredOutputModel.invoke.mockResolvedValue({
      intention: 'DEFAULT',
      reasoning: 'default fallback',
    } as any);
    const nodeConfig: IntentRecognitionNodeConfigType = {
      prompt: 'User message',
      branches: [branch1, branch2, defaultBranch],
    };
    const definition = createDefinition(nodeConfig);
    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);

    await runner.run(getRunParams(nodeConfig));

    expect(runNodeSequenceMock).toHaveBeenCalledTimes(1);
    expect(runNodeSequenceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sequence: defaultBranch.steps,
        runner: services.workflowRunner,
        state,
      })
    );
  });

  it('throws error if model returns unknown intention', async () => {
    structuredOutputModel.invoke.mockResolvedValue({
      intention: 'UNKNOWN_INTENTION',
      reasoning: 'unknown selection',
    } as any);
    const nodeConfig: IntentRecognitionNodeConfigType = {
      prompt: 'User message',
      branches: [branch1, defaultBranch],
    };
    const definition = createDefinition(nodeConfig);
    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);

    await expect(runner.run(getRunParams(nodeConfig))).rejects.toThrow(
      'No branch found for selected intention'
    );
    await expect(runner.run(getRunParams(nodeConfig))).rejects.toBeInstanceOf(
      WorkflowExecutionError
    );
    await expect(runner.run(getRunParams(nodeConfig))).rejects.toHaveProperty(
      'type',
      'internalError'
    );
  });

  it('uses default branch ID if not specified', async () => {
    const branchWithoutId: IntentRecognitionConditionBranch = {
      condition: 'Condition 3',
      steps: [],
    };
    const nodeConfig: IntentRecognitionNodeConfigType = {
      prompt: 'User message',
      branches: [branchWithoutId, defaultBranch],
    };
    const definition = createDefinition(nodeConfig);
    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);

    // Mock model to return default generated ID
    structuredOutputModel.invoke.mockResolvedValue({
      intention: 'INTENTION-0',
      reasoning: 'generated ID selected',
    } as any);

    await runner.run(getRunParams(nodeConfig));

    expect(runNodeSequenceMock).toHaveBeenCalledTimes(1);
    expect(runNodeSequenceMock).toHaveBeenCalledWith(expect.objectContaining({ sequence: [] }));

    // Verify prompt generation used default ID
    expect(structuredOutputModel.invoke).toHaveBeenCalledTimes(1);
    const systemPromptMatcherDefault = expect.stringContaining(
      `1. INTENTION-0 — Condition 3.\n2. DEFAULT — The user message doesn't match any of the above.`
    );
    const userPromptMatcherDefault = 'User message';
    expect(structuredOutputModel.invoke).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.arrayContaining(['system', systemPromptMatcherDefault]),
        expect.arrayContaining(['user', userPromptMatcherDefault]),
      ])
    );
  });
});
