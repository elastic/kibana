/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAppContextStartContractMock } from '../../../mocks';
import { appContextService } from '../..';

import { handleStateMachine } from './integrations_state_machine';

const getTestDefinition = (mockEvent1: any, mockEvent2: any, mockEvent3: any, context?: any) => {
  return {
    context,
    states: {
      state1: {
        onTransitionTo: mockEvent1,
        nextState: 'state2',
      },
      state2: {
        onTransitionTo: mockEvent2,
        nextState: 'state3',
      },
      state3: {
        onTransitionTo: mockEvent3,
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
      'state: state1 - status success - stateResult: undefined - nextState: state2'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'state: state2 - status success - stateResult: undefined - nextState: state3'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'state: state3 - status success - stateResult: undefined - nextState: end'
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

  it('should call the onTransition function with the provided data', async () => {
    const mockEventState1 = jest.fn();
    const mockEventState2 = jest.fn();
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
    expect(mockEventState2).toHaveBeenCalledWith({ testData: 'test' });
    expect(mockEventState3).toHaveBeenCalledWith({ testData: 'test' });

    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'state: state1 - status success - stateResult: undefined - nextState: state2'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'state: state2 - status success - stateResult: undefined - nextState: state3'
    );
    expect(mockContract.logger?.debug).toHaveBeenCalledWith(
      'state: state3 - status success - stateResult: undefined - nextState: end'
    );
  });
});
