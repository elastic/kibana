/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { appContextService } from '../../app_context';
export interface State {
  onTransition: any;
  nextState?: string;
  currentStatus?: string;
  onPostTransition?: any;
}

export type StatusName = 'success' | 'failed' | 'pending';
export type StateMachineStates<T extends string> = Record<T, State>;
export interface StateMachineDefinition<T extends string> {
  context?: any;
  states: StateMachineStates<T>;
}

export async function handleState(
  currentStateName: string,
  definition: StateMachineDefinition<string>,
  context: { [key: string]: any }
): Promise<{ [key: string]: any }> {
  const logger = appContextService.getLogger();
  const { states } = definition;
  const currentState = states[currentStateName];
  let currentStatus = 'pending';
  let stateResult;
  let updatedContext = { ...context };
  if (typeof currentState.onTransition === 'function') {
    logger.debug(
      `Current state ${currentStateName} -  Running transition ${currentState.onTransition.name}`
    );
    try {
      stateResult = await currentState.onTransition.call(undefined, updatedContext);
      // check if is a function/promise
      if (typeof stateResult === 'function') {
        const promiseName = `${currentStateName}Result`;
        updatedContext[promiseName] = stateResult;
      } else {
        updatedContext = { ...updatedContext, ...stateResult };
      }
      currentStatus = 'success';
      logger.debug(
        `Executed state: ${currentStateName} with status: ${currentStatus} - nextState: ${currentState.nextState}`
      );
    } catch (error) {
      currentStatus = 'failed';
      logger.warn(
        `Error during execution of state "${currentStateName}" with status "${currentStatus}": ${error.message}`
      );
    }
  } else {
    currentStatus = 'failed';
  }

  if (typeof currentState.onPostTransition === 'function') {
    try {
      await currentState.onPostTransition.call(undefined, updatedContext);
      logger.debug(`Executing post transition function: ${currentState.onPostTransition.name}`);
    } catch (error) {
      logger.warn(`Error during execution of post transition function: ${error.message}`);
    }
  }
  if (currentStatus === 'success' && currentState?.nextState && currentState?.nextState !== 'end') {
    return await handleState(currentState.nextState, definition, updatedContext);
  } else {
    return updatedContext;
  }
}
