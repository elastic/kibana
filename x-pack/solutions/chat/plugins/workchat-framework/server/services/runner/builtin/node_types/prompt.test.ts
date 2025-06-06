/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessageChunk } from '@langchain/core/messages';
import { NodeType } from '@kbn/wc-framework-types-common';
import {
  type NodeRunnerFactory,
  type NodeFactoryContext,
  type PromptNodeConfigType,
  type BuiltInNodeDefinition,
  type RunNodeParams,
  type WorkflowExecutionState,
} from '@kbn/wc-framework-types-server';
import { getPromptNodeTypeDefinition } from './prompt';
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

describe('Node type: prompt', () => {
  let factory: NodeRunnerFactory<PromptNodeConfigType>;
  let services: MockedNodeFactoryBaseServices;
  let state: MockedState;
  let eventReporter: NodeEventReporterMock;
  let executionState: WorkflowExecutionState;
  let model: MockedModel;

  const createMessageChunk = (content: string): AIMessageChunk => {
    return new AIMessageChunk({ content });
  };

  beforeEach(() => {
    services = createMockFactoryServices();
    const definition = getPromptNodeTypeDefinition();
    factory = definition.factory;
    state = createMockedState();
    eventReporter = createMockedNodeEventReporter();
    executionState = createExecutionState();

    model = createMockedModel();
    model.invoke.mockResolvedValue(createMessageChunk('LLM response'));
    services.modelProvider.getDefaultModel.mockReturnValue(model);
  });

  const getRunParams = ({
    input,
  }: {
    input: PromptNodeConfigType;
  }): RunNodeParams<PromptNodeConfigType> => {
    return { input, state, eventReporter, executionState };
  };

  const createDefinition = (
    config: PromptNodeConfigType
  ): BuiltInNodeDefinition<NodeType.prompt> => {
    return {
      id: 'test-prompt-node',
      type: NodeType.prompt,
      configuration: config,
    };
  };

  it('invokes the model with interpolated prompt', async () => {
    const nodeConfig: PromptNodeConfigType = {
      prompt: 'Tell me about {topic}',
      output: 'llmResult',
    };
    const definition = createDefinition(nodeConfig);

    state.set('topic', 'Kibana');

    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);
    const runParams = getRunParams({ input: nodeConfig });

    await runner.run(runParams);

    expect(services.modelProvider.getDefaultModel).toHaveBeenCalledTimes(1);

    expect(model.invoke).toHaveBeenCalledTimes(1);
    expect(model.invoke).toHaveBeenCalledWith('Tell me about Kibana');

    expect(state.set).toHaveBeenCalledWith('llmResult', 'LLM response');
  });

  it('interpolates output key', async () => {
    const nodeConfig: PromptNodeConfigType = {
      prompt: 'Static prompt',
      output: '{outputVar}',
    };
    const definition = createDefinition(nodeConfig);

    state.set('outputVar', 'dynamicResultKey');

    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);
    const runParams = getRunParams({ input: nodeConfig });

    await runner.run(runParams);

    expect(model.invoke).toHaveBeenCalledWith('Static prompt');
    expect(state.set).toHaveBeenCalledWith('dynamicResultKey', 'LLM response');
  });
});
