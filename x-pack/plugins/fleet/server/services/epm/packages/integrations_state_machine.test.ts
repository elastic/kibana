/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAppContextStartContractMock } from '../../../mocks';
import { appContextService } from '../..';

import { handleStateMachine } from './integrations_state_machine';

const getTestDefinition = (
  mockEvent1: any,
  mockEvent2: any,
  mockEvent3: any,
  context?: any,
  onPostTransition?: any
) => {
  return {
    context,
    states: {
      state1: {
        onTransitionTo: mockEvent1,
        onPostTransition,
        nextState: 'state2',
      },
      state2: {
        onTransitionTo: mockEvent2,
        onPostTransition,
        nextState: 'state3',
      },
      state3: {
        onTransitionTo: mockEvent3,
        onPostTransition,
        nextState: 'end',
      },
    },
  };
};

describe('handleStateMachine', () => {
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  beforeEach(async () => {
    // prevents `Logger not set.` and other appContext errors
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
  });
  afterEach(() => {
    jest.resetAllMocks();
    appContextService.stop();
  });

  it('should execute all the state machine transitions based on the provided data structure', async () => {
    const mockEventState1 = jest.fn();
    const mockEventState2 = jest.fn();
    const mockEventState3 = jest.fn();
    const testDefinition = getTestDefinition(mockEventState1, mockEventState2, mockEventState3);

    await handleStateMachine('state1', testDefinition);
    expect(mockEventState1).toHaveBeenCalledTimes(1);
    expect(mockEventState2).toHaveBeenCalledTimes(1);
    expect(mockEventState3).toHaveBeenCalledTimes(1);
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state1 with status: success - nextState: state2'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state2 with status: success - nextState: state3'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state3 with status: success - nextState: end'
    );
  });

  it('should execute the transition from the provided state', async () => {
    const mockEventState1 = jest.fn();
    const mockEventState2 = jest.fn();
    const mockEventState3 = jest.fn();
    const testDefinition = getTestDefinition(mockEventState1, mockEventState2, mockEventState3);
    await handleStateMachine('state2', testDefinition);

    expect(mockEventState1).toHaveBeenCalledTimes(0);
    expect(mockEventState2).toHaveBeenCalledTimes(1);
    expect(mockEventState3).toHaveBeenCalledTimes(1);
  });

  it('should exit when a state returns error', async () => {
    const error = new Error('Installation failed');
    const mockEventState1 = jest.fn().mockRejectedValue(error);
    const mockEventState2 = jest.fn();
    const mockEventState3 = jest.fn();
    const testDefinition = getTestDefinition(mockEventState1, mockEventState2, mockEventState3);
    await handleStateMachine('state1', testDefinition);

    expect(mockEventState1).toHaveBeenCalledTimes(1);
    expect(mockEventState2).toHaveBeenCalledTimes(0);
    expect(mockEventState3).toHaveBeenCalledTimes(0);
    expect(mockContract.logger?.warn).toHaveBeenCalledWith(
      'Error during execution of state "state1" with status "failed": Installation failed'
    );
  });

  it('should call the onTransition function with context data and the return value is saved for the next iteration', async () => {
    const mockEventState1 = jest.fn().mockReturnValue({ arrayData: ['test1', 'test2'] });
    const mockEventState2 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ promiseData: {} }));
    const mockEventState3 = jest.fn().mockReturnValue({ lastData: ['test3'] });
    const contextData = { testData: 'test' };
    const testDefinition = getTestDefinition(
      mockEventState1,
      mockEventState2,
      mockEventState3,
      contextData
    );

    await handleStateMachine('state1', testDefinition);
    expect(mockEventState1).toHaveBeenCalledWith({ testData: 'test' });
    expect(mockEventState2).toHaveBeenCalledWith({
      testData: 'test',
      arrayData: ['test1', 'test2'],
    });
    expect(mockEventState3).toHaveBeenCalledWith({
      testData: 'test',
      arrayData: ['test1', 'test2'],
      promiseData: {},
    });

    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state1 with status: success - nextState: state2'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state2 with status: success - nextState: state3'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state3 with status: success - nextState: end'
    );
  });

  it('should save the return data from transitions also when return type is function', async () => {
    const mockEventState1 = jest.fn().mockReturnValue({ arrayData: ['test1', 'test2'] });
    const state2Result = () => {
      return {
        innerData: 'test',
      };
    };
    const mockEventState2 = jest.fn().mockImplementation(() => {
      return state2Result;
    });
    const mockEventState3 = jest.fn();
    const contextData = { testData: 'test' };
    const testDefinition = getTestDefinition(
      mockEventState1,
      mockEventState2,
      mockEventState3,
      contextData
    );

    await handleStateMachine('state1', testDefinition);
    expect(mockEventState1).toHaveBeenCalledWith({ testData: 'test' });
    expect(mockEventState2).toHaveBeenCalledWith({
      testData: 'test',
      arrayData: ['test1', 'test2'],
      state2Result,
    });
    expect(mockEventState3).toHaveBeenCalledWith({
      testData: 'test',
      arrayData: ['test1', 'test2'],
      state2Result,
    });

    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state1 with status: success - nextState: state2'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state2 with status: success - nextState: state3'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executed state: state3 with status: success - nextState: end'
    );
  });

  it.skip('should return updated context data', async () => {
    const mockEventState1 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ promiseData: {} }));
    const state2Result = () => {
      return {
        innerData: 'test',
      };
    };
    const mockEventState2 = jest.fn().mockImplementation(() => {
      return state2Result;
    });
    const mockEventState3 = jest.fn().mockReturnValue({ lastData: ['test3'] });
    const contextData = { testData: 'test' };
    const testDefinition = getTestDefinition(
      mockEventState1,
      mockEventState2,
      mockEventState3,
      contextData
    );

    const updatedContext = await handleStateMachine('state1', testDefinition);
    expect(mockEventState1).toHaveBeenCalledWith({ testData: 'test' });
    expect(mockEventState2).toHaveBeenCalledWith({
      testData: 'test',
      promiseData: {},
      state2Result,
    });
    expect(mockEventState3).toHaveBeenCalledWith({
      testData: 'test',
      promiseData: {},
      state2Result,
    });

    expect(updatedContext).toEqual({
      testData: 'test',
      promiseData: {},
      state2Result,
      lastData: ['test3'],
    });
  });

  it('should execute postTransition function after the transition is complete', async () => {
    const mockEventState1 = jest.fn();
    const mockEventState2 = jest.fn();
    const mockEventState3 = jest.fn();
    const mockPostTransition = jest.fn();
    const testDefinition = getTestDefinition(
      mockEventState1,
      mockEventState2,
      mockEventState3,
      undefined,
      mockPostTransition
    );
    await handleStateMachine('state1', testDefinition);

    expect(mockEventState1).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockEventState2).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockEventState3).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executing post transition function: mockConstructor'
    );
  });
});
