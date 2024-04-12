/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { appContextService } from '../../../app_context';
import type { StateContext, LatestExecutedState } from '../../../../../common/types';
export interface State {
  onTransition: any;
  nextState?: string;
  currentStatus?: string;
  onPostTransition?: any;
}

export type StatusName = 'success' | 'failed' | 'pending';
export type StateMachineStates<T extends string> = Record<T, State>;
/*
 * Data structure defining the state machine
 *  {
 *    context: {},
 *    states: {
 *      state1: {
 *        onTransition: onState1Transition,
 *        onPostTransition: onPostTransition,
 *        nextState: 'state2',
 *      },
 *      state2: {
 *        onTransition: onState2Transition,
 *        onPostTransition: onPostTransition,,
 *        nextState: 'state3',
 *      },
 *      state3: {
 *        onTransition: onState3Transition,
 *        onPostTransition: onPostTransition,
 *        nextState: 'end',
 *      }
 *    }
 */
export interface StateMachineDefinition<T extends string> {
  context: StateContext<string>;
  states: StateMachineStates<T>;
}
/*
 * Generic state machine implemented to handle state transitions, based on a provided data structure
 * currentStateName: iniital state
 * definition: data structure defined as a StateMachineDefinition
 * context: object keeping the state between transitions. All the transition functions accept it as input parameter and write to it
 *
 * It recursively traverses all the states until it finds the last state.
 */
export async function handleState(
  currentStateName: string,
  definition: StateMachineDefinition<string>,
  context: StateContext<string>
): Promise<StateContext<string>> {
  const logger = appContextService.getLogger();
  const { states } = definition;
  const currentState = states[currentStateName];
  let currentStatus = 'pending';
  let stateResult;
  let updatedContext = { ...context };
  if (typeof currentState.onTransition === 'function') {
    logger.debug(
      `Current state ${currentStateName}: running transition ${currentState.onTransition.name}`
    );
    try {
      // inject information about the state into context
      const startedAt = new Date(Date.now()).toISOString();
      const latestExecutedState: LatestExecutedState<string> = {
        name: currentStateName,
        started_at: startedAt,
      };
      stateResult = await currentState.onTransition.call(undefined, updatedContext);
      // check if is a function/promise
      if (typeof stateResult === 'function') {
        const promiseName = `${currentStateName}Result`;
        updatedContext[promiseName] = stateResult;
        updatedContext = { ...updatedContext, latestExecutedState };
      } else {
        updatedContext = {
          ...updatedContext,
          ...stateResult,
          latestExecutedState,
        };
      }
      currentStatus = 'success';
      logger.debug(
        `Executed state: ${currentStateName} with status: ${currentStatus} - nextState: ${currentState.nextState}`
      );
    } catch (error) {
      currentStatus = 'failed';
      const errorMessage = `Error during execution of state "${currentStateName}" with status "${currentStatus}": ${error.message}`;
      const latestStateWithError = {
        ...updatedContext.latestExecutedState,
        error: errorMessage,
      } as LatestExecutedState<string>;
      updatedContext = { ...updatedContext, latestExecutedState: latestStateWithError };
      logger.warn(errorMessage);

      // execute post transition function when transition failed too
      await executePostTransition(logger, updatedContext, currentState);

      // bubble up the error
      throw error;
    }
  } else {
    currentStatus = 'failed';
    logger.warn(
      `Execution of state "${currentStateName}" with status "${currentStatus}": provided onTransition is not a valid function`
    );
  }
  // execute post transition function
  await executePostTransition(logger, updatedContext, currentState);

  if (currentStatus === 'success' && currentState?.nextState && currentState?.nextState !== 'end') {
    return await handleState(currentState.nextState, definition, updatedContext);
  } else {
    return updatedContext;
  }
}

async function executePostTransition(
  logger: Logger,
  updatedContext: StateContext<string>,
  currentState: State
) {
  if (typeof currentState.onPostTransition === 'function') {
    try {
      await currentState.onPostTransition.call(undefined, updatedContext);
      logger.debug(`Executing post transition function: ${currentState.onPostTransition.name}`);
    } catch (error) {
      logger.warn(`Error during execution of post transition function: ${error.message}`);
    }
  }
}
