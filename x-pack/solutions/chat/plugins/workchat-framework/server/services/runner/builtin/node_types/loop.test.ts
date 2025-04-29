/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import {
  WorkflowExecutionError,
  type NodeFactoryContext,
  type LoopNodeConfigType,
  type NodeTypeDefinition,
  type RunNodeParams,
  type WorkflowExecutionState,
  type NodeDefinition,
} from '@kbn/wc-framework-types-server';
import { getLoopNodeTypeDefinition } from './loop';
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

describe('Node type: loop', () => {
  let services: MockedNodeFactoryBaseServices;
  let state: MockedState;
  let eventReporter: NodeEventReporterMock;
  let executionState: WorkflowExecutionState;
  let nodeDefinition: NodeTypeDefinition<LoopNodeConfigType>;

  beforeEach(() => {
    jest.clearAllMocks();
    services = createMockFactoryServices();
    nodeDefinition = getLoopNodeTypeDefinition();
    state = createMockedState();
    eventReporter = createMockedNodeEventReporter();
    executionState = createExecutionState();
  });

  const getRunParams = (input: LoopNodeConfigType): RunNodeParams<LoopNodeConfigType> => {
    return { input, state, eventReporter, executionState };
  };

  const createNodeContext = (config: LoopNodeConfigType): NodeFactoryContext => {
    const fullNodeDef: NodeDefinition = {
      id: 'test-loop-node',
      type: NodeType.loop,
      configuration: config,
    };
    return { nodeConfiguration: fullNodeDef, services };
  };

  it('iterates over a list from the state and executes sequence for each item', async () => {
    const nodeConfig: LoopNodeConfigType = {
      inputList: 'inputList',
      itemVar: 'currentItem',
      steps: [
        { id: 'step1', type: NodeType.prompt, configuration: { prompt: 'foo', output: 'bar' } },
      ],
    };

    state.set('inputList', ['apple', 'banana', 'cherry']);

    const runParams = getRunParams(nodeConfig);
    const runner = nodeDefinition.factory(createNodeContext(nodeConfig));

    await runner.run(runParams);

    expect(runNodeSequenceMock).toHaveBeenCalledTimes(3);

    expect(runNodeSequenceMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sequence: nodeConfig.steps,
      })
    );
    expect(runNodeSequenceMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sequence: nodeConfig.steps,
      })
    );
    expect(runNodeSequenceMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        sequence: nodeConfig.steps,
      })
    );

    expect(state.set).toHaveBeenCalledWith('currentItem', 'apple');
    expect(state.set).toHaveBeenCalledWith('currentItem', 'banana');
    expect(state.set).toHaveBeenCalledWith('currentItem', 'cherry');
  });

  it('iterates over a list from state variable', async () => {
    const listFromState = ['one', 'two'];
    state.set('myListKey', listFromState);

    const nodeConfig: LoopNodeConfigType = {
      inputList: `{myListKey}`,
      itemVar: 'loopItem',
      steps: [
        { id: 'step1', type: NodeType.prompt, configuration: { prompt: 'foo', output: 'bar' } },
      ],
    };
    const runner = nodeDefinition.factory(createNodeContext(nodeConfig));
    const runParams = getRunParams(nodeConfig);

    await runner.run(runParams);

    expect(runNodeSequenceMock).toHaveBeenCalledTimes(2);
    expect(state.set).toHaveBeenCalledWith('loopItem', 'one');
    expect(state.set).toHaveBeenCalledWith('loopItem', 'two');
  });

  it('interpolates itemVar name', async () => {
    state.set('itemVar', 'dynamicItem');
    state.set('inputList', [10, 20]);

    const nodeConfig: LoopNodeConfigType = {
      inputList: 'inputList',
      itemVar: `{itemVar}`,
      steps: [
        { id: 'step1', type: NodeType.prompt, configuration: { prompt: 'foo', output: 'bar' } },
      ],
    };
    const runner = nodeDefinition.factory(createNodeContext(nodeConfig));
    const runParams = getRunParams(nodeConfig);

    await runner.run(runParams);

    expect(runNodeSequenceMock).toHaveBeenCalledTimes(2);
    expect(state.set).toHaveBeenCalledWith('dynamicItem', 10);
    expect(state.set).toHaveBeenCalledWith('dynamicItem', 20);
  });

  it('collects results when output is configured', async () => {
    let index = 1;
    runNodeSequenceMock.mockImplementation((params: any) => {
      params.state.set('stepOutput', `result-${index}`);
      index++;
    });

    state.set('inputList', [10, 20, 30]);

    const nodeConfig: LoopNodeConfigType = {
      inputList: 'inputList',
      itemVar: 'num',
      steps: [
        { id: 'step1', type: NodeType.prompt, configuration: { prompt: 'foo', output: 'bar' } },
      ],
      output: {
        source: 'stepOutput',
        destination: 'loopResults',
      },
    };
    const runner = nodeDefinition.factory(createNodeContext(nodeConfig));
    const runParams = getRunParams(nodeConfig);

    await runner.run(runParams);

    expect(runNodeSequenceMock).toHaveBeenCalledTimes(3);
    expect(state.get('loopResults')).toEqual(['result-1', 'result-2', 'result-3']);
  });

  it('throws error if itemVar interpolates to non-string', async () => {
    expect.assertions(3);

    state.set('inputList', [10, 20]);
    state.set('badItemVar', { not: 'a string' });

    const nodeConfig: LoopNodeConfigType = {
      inputList: 'inputList',
      itemVar: `{badItemVar}`,
      steps: [],
    };
    const runner = nodeDefinition.factory(createNodeContext(nodeConfig));
    const runParams = getRunParams(nodeConfig);

    try {
      await runner.run(runParams);
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowExecutionError);
      expect((error as WorkflowExecutionError).type).toBe('invalidParameter');
      expect((error as WorkflowExecutionError).message).toMatch(
        /itemVar interpolated to a non-string value/
      );
    }
  });
});
