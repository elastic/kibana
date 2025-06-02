/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import {
  type NodeRunnerFactory,
  type NodeFactoryContext,
  type ParallelSequencesNodeConfigType,
  type BuiltInNodeDefinition,
  type RunNodeParams,
  type WorkflowExecutionState,
} from '@kbn/wc-framework-types-server';
import { getParallelSequencesNodeTypeDefinition } from './parallel_sequences';
import * as utils from '../../utils';
import {
  createMockFactoryServices,
  createMockedState,
  createMockedNodeEventReporter,
  createExecutionState,
  MockedNodeFactoryBaseServices,
  MockedState,
  NodeEventReporterMock,
} from '../../test_utils';

jest.mock('../../utils', () => ({
  runNodeSequence: jest.fn(),
}));
const runNodeSequenceMock = utils.runNodeSequence as jest.Mock;

describe('Node type: parallelSequences', () => {
  let factory: NodeRunnerFactory<ParallelSequencesNodeConfigType>;
  let services: MockedNodeFactoryBaseServices;
  let state: MockedState;
  let eventReporter: NodeEventReporterMock;
  let executionState: WorkflowExecutionState;

  beforeEach(() => {
    jest.clearAllMocks();
    services = createMockFactoryServices();
    const definition = getParallelSequencesNodeTypeDefinition();
    factory = definition.factory;
    state = createMockedState();
    eventReporter = createMockedNodeEventReporter();
    executionState = createExecutionState();
  });

  const getRunParams = ({
    input,
  }: {
    input: ParallelSequencesNodeConfigType;
  }): RunNodeParams<ParallelSequencesNodeConfigType> => {
    return { input, state, eventReporter, executionState };
  };

  const createDefinition = (
    config: ParallelSequencesNodeConfigType
  ): BuiltInNodeDefinition<NodeType.parallelSequences> => {
    return {
      id: 'test-parallel-node',
      type: NodeType.parallelSequences,
      configuration: config,
    };
  };

  it('runs each branch sequence in parallel', async () => {
    const branch1Steps = [
      {
        id: 'step1a',
        type: NodeType.prompt,
        configuration: { prompt: 'p1', output: 'o1' },
      } as BuiltInNodeDefinition<NodeType.prompt>,
    ];
    const branch2Steps = [
      {
        id: 'step2a',
        type: NodeType.toolExecution,
        configuration: { toolId: 't1', toolArguments: {}, parseResponse: false, output: 'o2' },
      } as BuiltInNodeDefinition<NodeType.toolExecution>,
    ];
    const nodeConfig: ParallelSequencesNodeConfigType = {
      branches: [{ steps: branch1Steps }, { steps: branch2Steps }],
    };
    const definition = createDefinition(nodeConfig);
    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);
    const runParams = getRunParams({ input: nodeConfig });

    await runner.run(runParams);

    expect(runNodeSequenceMock).toHaveBeenCalledTimes(2);

    expect(runNodeSequenceMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sequence: branch1Steps,
        runner: services.workflowRunner,
        state,
      })
    );
    expect(runNodeSequenceMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sequence: branch2Steps,
        runner: services.workflowRunner,
        state,
      })
    );
  });

  it('handles empty branches configuration', async () => {
    const nodeConfig: ParallelSequencesNodeConfigType = {
      branches: [],
    };
    const definition = createDefinition(nodeConfig);
    const context: NodeFactoryContext = { nodeConfiguration: definition, services };
    const runner = factory(context);
    const runParams = getRunParams({ input: nodeConfig });

    await runner.run(runParams);

    expect(runNodeSequenceMock).not.toHaveBeenCalled();
  });
});
