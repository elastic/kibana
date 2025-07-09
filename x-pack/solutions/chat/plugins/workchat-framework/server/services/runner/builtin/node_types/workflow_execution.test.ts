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
  type WorkflowExecutionNodeConfigType,
  type BuiltInNodeDefinition,
  type RunNodeParams,
  type WorkflowExecutionState,
  type WorkflowDefinition,
} from '@kbn/wc-framework-types-server';
import { getWorkflowExecutionNodeTypeDefinition } from './workflow_execution';
import {
  createMockFactoryServices,
  createMockedState,
  createMockedNodeEventReporter,
  createExecutionState,
  MockedNodeFactoryBaseServices,
  MockedState,
  NodeEventReporterMock,
} from '../../test_utils';

describe('Node type: workflowExecution', () => {
  let services: MockedNodeFactoryBaseServices;
  let factory: NodeRunnerFactory<WorkflowExecutionNodeConfigType>;
  let state: MockedState;
  let eventReporter: NodeEventReporterMock;
  let executionState: WorkflowExecutionState;

  const mockWorkflowOutput = { result: 'workflow success data' };

  beforeEach(() => {
    jest.clearAllMocks();
    services = createMockFactoryServices();
    const definition = getWorkflowExecutionNodeTypeDefinition();
    factory = definition.factory;
    state = createMockedState();
    eventReporter = createMockedNodeEventReporter();
    executionState = createExecutionState();

    services.workflowRegistry.has.mockReturnValue(true);
    const workflowDef = { id: 'mock-workflow', description: 'mocked' } as WorkflowDefinition;
    services.workflowRegistry.get.mockReturnValue(workflowDef);
    services.workflowRunner.runWorkflow.mockResolvedValue({
      runId: '42',
      output: mockWorkflowOutput,
    });
  });

  const getRunParams = (
    input: WorkflowExecutionNodeConfigType
  ): RunNodeParams<WorkflowExecutionNodeConfigType> => {
    return { input, state, eventReporter, executionState };
  };

  const createDefinition = (
    config: WorkflowExecutionNodeConfigType
  ): BuiltInNodeDefinition<NodeType.workflowExecution> => {
    return {
      id: 'test-workflow-exec-node',
      type: NodeType.workflowExecution,
      configuration: config,
    };
  };

  it('executes the specified workflow and stores the output', async () => {
    const nodeConfig: WorkflowExecutionNodeConfigType = {
      workflowId: 'existing-workflow',
      inputs: { param1: 'value1' },
      output: 'workflowResult',
    };
    const definition = createDefinition(nodeConfig);
    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);
    const runParams = getRunParams(nodeConfig);

    await runner.run(runParams);

    expect(services.workflowRegistry.has).toHaveBeenCalledWith('existing-workflow');
    expect(services.workflowRegistry.get).toHaveBeenCalledWith('existing-workflow');
    expect(services.workflowRunner.runWorkflow).toHaveBeenCalledWith({
      workflowDefinition: services.workflowRegistry.get('existing-workflow'),
      inputs: { param1: 'value1' },
    });
    expect(state.get('workflowResult')).toEqual(mockWorkflowOutput);
  });

  it('throws WorkflowExecutionError if workflow is not found', async () => {
    const nodeConfig: WorkflowExecutionNodeConfigType = {
      workflowId: 'non-existent-workflow',
      inputs: {},
      output: 'outputKey',
    };
    const definition = createDefinition(nodeConfig);

    services.workflowRegistry.has.mockReturnValue(false);

    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);
    const runParams = getRunParams(nodeConfig);

    await expect(runner.run(runParams)).rejects.toBeInstanceOf(WorkflowExecutionError);
    await expect(runner.run(runParams)).rejects.toHaveProperty('type', 'workflowNotFound');

    expect(services.workflowRegistry.get).not.toHaveBeenCalled();
    expect(services.workflowRunner.runWorkflow).not.toHaveBeenCalled();
    expect(state.set).not.toHaveBeenCalled();
  });

  it('interpolates workflowId, inputs, and output key from state', async () => {
    const nodeConfig: WorkflowExecutionNodeConfigType = {
      workflowId: '{dynamicWorkflowId}',
      inputs: { static: 'abc', dynamic: '{dynamicInput}' },
      output: '{dynamicOutputKey}',
    };
    const definition = createDefinition(nodeConfig);

    state.set('dynamicWorkflowId', 'actual-workflow-id');
    state.set('dynamicInput', 'dynamicValue123');
    state.set('dynamicOutputKey', 'actualOutputKey');

    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);
    const runParams = getRunParams(nodeConfig);

    await runner.run(runParams);

    const expectedWorkflowId = 'actual-workflow-id';
    const expectedInputs = { static: 'abc', dynamic: 'dynamicValue123' };
    const expectedOutputKey = 'actualOutputKey';

    expect(services.workflowRegistry.has).toHaveBeenCalledWith(expectedWorkflowId);
    expect(services.workflowRegistry.get).toHaveBeenCalledWith(expectedWorkflowId);
    expect(services.workflowRunner.runWorkflow).toHaveBeenCalledWith({
      workflowDefinition: services.workflowRegistry.get(expectedWorkflowId),
      inputs: expectedInputs,
    });
    expect(state.get(expectedOutputKey)).toEqual(mockWorkflowOutput);
  });
});
