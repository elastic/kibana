/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAppContextStartContractMock } from '../../../../mocks';
import { appContextService } from '../../..';

import { handleState } from './state_machine';

const getTestDefinition = (
  mockOnTransition1: any,
  mockOnTransition2: any,
  mockOnTransition3: any,
  context?: any,
  onPostTransition?: any
) => {
  return {
    context,
    states: {
      state1: {
        onTransition: mockOnTransition1,
        onPostTransition,
        nextState: 'state2',
      },
      state2: {
        onTransition: mockOnTransition2,
        onPostTransition,
        nextState: 'state3',
      },
      state3: {
        onTransition: mockOnTransition3,
        onPostTransition,
        nextState: 'end',
      },
    },
  };
};

describe('handleState', () => {
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
    const mockOnTransitionState1 = jest.fn();
    const mockOnTransitionState2 = jest.fn();
    const mockOnTransitionState3 = jest.fn();
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3
    );

    await handleState('state1', testDefinition, testDefinition.context);
    expect(mockOnTransitionState1).toHaveBeenCalledTimes(1);
    expect(mockOnTransitionState2).toHaveBeenCalledTimes(1);
    expect(mockOnTransitionState3).toHaveBeenCalledTimes(1);
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

  it('should call the onTransition function with context data and the return value is saved for the next iteration', async () => {
    const mockOnTransitionState1 = jest.fn().mockReturnValue({ arrayData: ['test1', 'test2'] });
    const mockOnTransitionState2 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ promiseData: {} }));
    const mockOnTransitionState3 = jest.fn().mockReturnValue({ lastData: ['test3'] });
    const contextData = { testData: 'test' };
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      contextData
    );

    await handleState('state1', testDefinition, testDefinition.context);
    expect(mockOnTransitionState1).toHaveBeenCalledWith({ testData: 'test' });
    expect(mockOnTransitionState2).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        arrayData: ['test1', 'test2'],
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransitionState3).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        arrayData: ['test1', 'test2'],
        promiseData: {},
        latestExecutedState: {
          name: 'state2',
          started_at: expect.anything(),
        },
      })
    );

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
    const mockOnTransitionState1 = jest.fn().mockReturnValue({ arrayData: ['test1', 'test2'] });
    const state2Result = () => {
      return {
        result: 'test',
      };
    };
    const mockOnTransitionState2 = jest.fn().mockImplementation(() => {
      return state2Result;
    });
    const mockOnTransitionState3 = jest.fn();
    const contextData = { testData: 'test' };
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      contextData
    );

    await handleState('state1', testDefinition, testDefinition.context);
    expect(mockOnTransitionState1).toHaveBeenCalledWith({ testData: 'test' });
    expect(mockOnTransitionState2).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        arrayData: ['test1', 'test2'],
        state2Result,
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransitionState3).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        arrayData: ['test1', 'test2'],
        state2Result,
        latestExecutedState: {
          name: 'state2',
          started_at: expect.anything(),
        },
      })
    );

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

  it('should return updated context data', async () => {
    const mockOnTransitionState1 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ promiseData: {} }));
    const state2Result = () => {
      return {
        result: 'test',
      };
    };
    const mockOnTransitionState2 = jest.fn().mockImplementation(() => {
      return state2Result;
    });
    const mockOnTransitionState3 = jest.fn().mockReturnValue({ lastData: ['test3'] });
    const contextData = { testData: 'test' };
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      contextData
    );

    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);
    expect(mockOnTransitionState1).toHaveBeenCalledWith({ testData: 'test' });
    expect(mockOnTransitionState2).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        promiseData: {},
        state2Result,
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransitionState3).toHaveBeenCalledWith(
      expect.objectContaining({
        testData: 'test',
        promiseData: {},
        state2Result,
        latestExecutedState: {
          name: 'state2',
          started_at: expect.anything(),
        },
      })
    );

    expect(updatedContext).toEqual(
      expect.objectContaining({
        testData: 'test',
        promiseData: {},
        state2Result,
        lastData: ['test3'],
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
  });

  it('should update a variable in the context at every call and return the updated value', async () => {
    const mockOnTransitionState1 = jest.fn().mockReturnValue({ runningVal: 'test1' });
    const mockOnTransitionState2 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ runningVal: 'test2' }));
    const mockOnTransitionState3 = jest.fn().mockReturnValue({ runningVal: 'test3' });
    const contextData = { runningVal: [], fixedVal: 'something' };
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      contextData
    );

    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);
    expect(mockOnTransitionState1).toHaveBeenCalledWith({ runningVal: [], fixedVal: 'something' });
    expect(mockOnTransitionState2).toHaveBeenCalledWith(
      expect.objectContaining({
        runningVal: 'test1',
        fixedVal: 'something',
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransitionState3).toHaveBeenCalledWith(
      expect.objectContaining({
        runningVal: 'test2',
        fixedVal: 'something',
        latestExecutedState: {
          name: 'state2',
          started_at: expect.anything(),
        },
      })
    );
    expect(updatedContext).toEqual(
      expect.objectContaining({
        fixedVal: 'something',
        runningVal: 'test3',
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
  });

  it('should execute the transition starting from the provided state', async () => {
    const mockOnTransitionState1 = jest.fn().mockReturnValue({ runningVal: 'test1' });
    const mockOnTransitionState2 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ runningVal: 'test2' }));
    const mockOnTransitionState3 = jest.fn().mockReturnValue({ runningVal: 'test3' });
    const contextData = { runningVal: [], fixedVal: 'something' };
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      contextData
    );

    const updatedContext = await handleState('state2', testDefinition, testDefinition.context);

    expect(mockOnTransitionState1).toHaveBeenCalledTimes(0);
    expect(mockOnTransitionState2).toHaveBeenCalledWith(
      expect.objectContaining({
        runningVal: [],
        fixedVal: 'something',
      })
    );
    expect(mockOnTransitionState3).toHaveBeenCalledWith(
      expect.objectContaining({
        runningVal: 'test2',
        fixedVal: 'something',
        latestExecutedState: {
          name: 'state2',
          started_at: expect.anything(),
        },
      })
    );
    expect(updatedContext).toEqual(
      expect.objectContaining({
        fixedVal: 'something',
        runningVal: 'test3',
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
  });

  it('should throw and return updated context with latest error when a state returns error', async () => {
    const error = new Error('Installation failed');
    const mockOnTransitionState1 = jest.fn().mockRejectedValue(error);
    const mockOnTransitionState2 = jest.fn();
    const mockOnTransitionState3 = jest.fn();
    const contextData = { fixedVal: 'something' };
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      contextData
    );
    try {
      const updatedContext = await handleState('state1', testDefinition, testDefinition.context);
      expect(updatedContext).toEqual(
        expect.objectContaining({
          fixedVal: 'something',
          latestExecutedState: {
            name: 'state3',
            started_at: expect.anything(),
            error: `Error during execution of state "state1" with status "failed": Installation failed`,
          },
        })
      );
    } catch (err) {
      expect(err).toEqual(
        `Error during execution of state "state1" with status "failed": Installation failed`
      );
    }
    expect(mockOnTransitionState1).toHaveBeenCalledTimes(1);
    expect(mockOnTransitionState2).toHaveBeenCalledTimes(0);
    expect(mockOnTransitionState3).toHaveBeenCalledTimes(0);
    expect(mockContract.logger?.warn).toHaveBeenCalledWith(
      'Error during execution of state "state1" with status "failed": Installation failed'
    );
  });

  it('should execute postTransition function after the transition is complete', async () => {
    const mockOnTransitionState1 = jest.fn();
    const mockOnTransitionState2 = jest.fn();
    const mockOnTransitionState3 = jest.fn();
    const mockPostTransition = jest.fn();
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      undefined,
      mockPostTransition
    );
    await handleState('state1', testDefinition, testDefinition.context);

    expect(mockOnTransitionState1).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockOnTransitionState2).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockOnTransitionState3).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executing post transition function: mockConstructor'
    );
  });

  it('should execute postTransition function after the transition passing the updated context', async () => {
    const mockOnTransitionState1 = jest.fn().mockReturnValue({ runningVal: 'test1' });
    const mockOnTransitionState2 = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ runningVal: 'test2' }));
    const mockOnTransitionState3 = jest.fn().mockReturnValue({ runningVal: 'test3' });
    const mockPostTransition = jest.fn();
    const contextData = { fixedVal: 'something' };
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      contextData,
      mockPostTransition
    );
    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);

    expect(mockOnTransitionState1).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockOnTransitionState2).toHaveBeenCalled();
    expect(mockPostTransition).toHaveBeenCalled();
    expect(mockOnTransitionState3).toHaveBeenCalled();
    expect(updatedContext).toEqual(
      expect.objectContaining({
        fixedVal: 'something',
        runningVal: 'test3',
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockPostTransition).toHaveBeenCalledWith(updatedContext);
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'Executing post transition function: mockConstructor'
    );
  });

  it('should execute postTransition correctly also when a transition throws', async () => {
    const error = new Error('Installation failed');
    const mockOnTransitionState1 = jest.fn().mockReturnValue({ result1: 'test' });
    const mockOnTransitionState2 = jest.fn().mockRejectedValue(error);
    const mockOnTransitionState3 = jest.fn();
    const mockPostTransition = jest.fn();
    const contextData = { testData: 'test' };
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      contextData,
      mockPostTransition
    );
    try {
      const updatedContext = await handleState('state1', testDefinition, testDefinition.context);
      expect(updatedContext).toEqual(
        expect.objectContaining({
          testData: 'test',
          result1: 'test',
          latestExecutedState: {
            name: 'state1',
            started_at: expect.anything(),
            error:
              'Error during execution of state "state2" with status "failed": Installation failed',
          },
        })
      );
    } catch (err) {
      expect(err).toEqual(
        `Error during execution of state \"state2\" with status \"failed\": Installation failed`
      );
    }
    expect(mockOnTransitionState1).toHaveBeenCalledTimes(1);
    expect(mockPostTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        result1: 'test',
        testData: 'test',
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
          error:
            'Error during execution of state "state2" with status "failed": Installation failed',
        },
      })
    );
    expect(mockOnTransitionState2).toHaveBeenCalledTimes(1);
    expect(mockPostTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        result1: 'test',
        testData: 'test',
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransitionState3).toHaveBeenCalledTimes(0);
  });

  it('should log a warning when postTransition exits with errors and continue executing the states', async () => {
    const error = new Error('Installation failed');
    const mockOnTransitionState1 = jest.fn().mockReturnValue({ result1: 'test' });
    const mockOnTransitionState2 = jest.fn();
    const mockOnTransitionState3 = jest.fn();
    const mockPostTransition = jest.fn().mockRejectedValue(error);
    const contextData = { testData: 'test' };
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      contextData,
      mockPostTransition
    );
    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);

    expect(mockOnTransitionState1).toHaveBeenCalledTimes(1);
    expect(mockPostTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        result1: 'test',
        testData: 'test',
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
    expect(mockOnTransitionState2).toHaveBeenCalledTimes(1);
    expect(mockOnTransitionState3).toHaveBeenCalledTimes(1);
    expect(mockContract.logger?.warn).toHaveBeenCalledWith(
      'Error during execution of post transition function: Installation failed'
    );

    expect(updatedContext).toEqual(
      expect.objectContaining({
        testData: 'test',
        result1: 'test',
        latestExecutedState: {
          name: 'state3',
          started_at: expect.anything(),
        },
      })
    );
  });

  it('should exit and log a warning when the provided OnTransition is not a function', async () => {
    const mockOnTransitionState1 = jest.fn().mockReturnValue({ result1: 'test' });
    const mockOnTransitionState2 = undefined;
    const mockOnTransitionState3 = jest.fn();

    const contextData = { testData: 'test' };
    const testDefinition = getTestDefinition(
      mockOnTransitionState1,
      mockOnTransitionState2,
      mockOnTransitionState3,
      contextData
    );
    const updatedContext = await handleState('state1', testDefinition, testDefinition.context);

    expect(mockOnTransitionState1).toHaveBeenCalledTimes(1);
    expect(mockOnTransitionState3).toHaveBeenCalledTimes(0);
    expect(mockContract.logger?.warn).toHaveBeenCalledWith(
      'Execution of state "state2" with status "failed": provided onTransition is not a valid function'
    );

    expect(updatedContext).toEqual(
      expect.objectContaining({
        testData: 'test',
        result1: 'test',
        latestExecutedState: {
          name: 'state1',
          started_at: expect.anything(),
        },
      })
    );
  });
});
