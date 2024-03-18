/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { appContextService } from '../../app_context';
export interface State {
  onTransitionTo: any;
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

export async function handleStateMachine(
  startState: string,
  definition: StateMachineDefinition<string>
) {
  await handleState(startState, definition);
}

async function handleState(currentStateName: string, definition: StateMachineDefinition<string>) {
  const logger = appContextService.getLogger();
  const { states, context } = definition;
  const currentState = states[currentStateName];
  let currentStatus = 'pending';
  let stateResult;

  if (typeof currentState.onTransitionTo === 'function') {
    try {
      stateResult = await currentState.onTransitionTo.call(undefined, context);
      currentStatus = 'success';
    } catch (error) {
      currentStatus = 'failed';
      logger.warn(
        `Error during execution of state "${currentStateName}" with status "${currentStatus}": ${error.message}`
      );
    }
  } else {
    currentStatus = 'failed';
  }
  logger.debug(
    `state: ${currentStateName} - status ${currentStatus} - stateResult: ${stateResult} - nextState: ${currentState.nextState}`
  );
  if (typeof currentState.onPostTransition === 'function') {
    try {
      await currentState.onPostTransition.call(undefined, context);
      logger.debug(`Executing post transition function: ${currentState.onPostTransition.name}`);
    } catch (error) {
      logger.warn(`Error during execution of post transition function: ${error.message}`);
    }
  }
  if (currentStatus === 'success' && currentState?.nextState && currentState?.nextState !== 'end') {
    handleState(currentState.nextState, definition);
  } else {
    return;
  }
}
