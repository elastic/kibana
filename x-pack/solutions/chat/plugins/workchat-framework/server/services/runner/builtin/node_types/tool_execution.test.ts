/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import {
  NodeRunnerFactory,
  NodeFactoryContext,
  ToolExecutionNodeConfigType,
  BuiltInNodeDefinition,
  RunNodeParams,
  WorkflowExecutionState,
} from '@kbn/wc-framework-types-server';
import { getToolExecutionNodeTypeDefinition } from './tool_execution';
import {
  createMockFactoryServices,
  createMockedState,
  createMockedNodeEventReporter,
  createExecutionState,
  createMockedTool,
  MockedNodeFactoryBaseServices,
  MockedState,
  NodeEventReporterMock,
} from '../../test_utils';

describe('Node type: toolExecution', () => {
  let services: MockedNodeFactoryBaseServices;
  let factory: NodeRunnerFactory<ToolExecutionNodeConfigType>;
  let state: MockedState;
  let eventReporter: NodeEventReporterMock;
  let executionState: WorkflowExecutionState;

  beforeEach(() => {
    services = createMockFactoryServices();
    const definition = getToolExecutionNodeTypeDefinition();
    factory = definition.factory;
    state = createMockedState();
    eventReporter = createMockedNodeEventReporter();
    executionState = createExecutionState();
  });

  const getRunParams = ({
    input,
  }: {
    input: ToolExecutionNodeConfigType;
  }): RunNodeParams<ToolExecutionNodeConfigType> => {
    return { input, state, eventReporter, executionState };
  };

  const createDefinition = (
    config: ToolExecutionNodeConfigType
  ): BuiltInNodeDefinition<NodeType.toolExecution> => {
    return {
      id: 'test',
      type: NodeType.toolExecution,
      configuration: config,
    };
  };

  it('calls the tool specified in the configuration', async () => {
    const definition = createDefinition({
      toolId: 'tool-id',
      output: 'toolResult',
      parseResponse: false,
      toolArguments: {
        argA: 'foo',
        argB: 42,
      },
    });

    const { toolProvider } = services;
    const mockTool = createMockedTool();
    toolProvider.has.mockResolvedValue(true);
    toolProvider.get.mockResolvedValue(mockTool);

    const context: NodeFactoryContext = {
      nodeConfiguration: definition,
      services,
    };
    const runner = factory(context);
    const input = definition.configuration;
    const runParams = getRunParams({ input });

    await runner.run(runParams);

    expect(toolProvider.get).toHaveBeenCalledTimes(1);
    expect(toolProvider.get).toHaveBeenCalledWith(definition.configuration.toolId);

    expect(mockTool.handler).toHaveBeenCalledTimes(1);
    expect(mockTool.handler).toHaveBeenCalledWith({
      argA: 'foo',
      argB: 42,
    });
  });
});
