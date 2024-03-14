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
}
export type StatusName = 'success' | 'failed' | 'pending';

export const installStateNames = [
  'create_restart_installation',
  'install_kibana_assets',
  'install_ml_model',
  'install_index_template_pipelines',
  'remove_legacy_templates',
  'update_current_write_indices',
  'install_transforms',
  'delete_previous_pipelines',
  'save_archive_entries_from_assets_map',
  'update_so',
] as const;

type StateNamesTuple = typeof installStateNames;
type StateNames = StateNamesTuple[number];
type StateMachineStates<T extends string> = Record<T, State>;

// example our install states
const installStates: StateMachineStates<StateNames> = {
  create_restart_installation: {
    nextState: 'install_kibana_assets',
    onTransitionTo: () => undefined,
  },
  install_kibana_assets: {
    onTransitionTo: () => undefined,
    nextState: 'install_ml_model',
  },
  install_ml_model: {
    onTransitionTo: () => undefined,
    nextState: 'install_index_template_pipelines',
  },
  install_index_template_pipelines: {
    onTransitionTo: () => undefined,
    nextState: 'remove_legacy_templates',
  },
  remove_legacy_templates: {
    onTransitionTo: () => undefined,
    nextState: 'update_current_write_indices',
  },
  update_current_write_indices: {
    onTransitionTo: () => undefined,
    nextState: 'install_transforms',
  },
  install_transforms: {
    onTransitionTo: () => undefined,
    nextState: 'delete_previous_pipelines',
  },
  delete_previous_pipelines: {
    onTransitionTo: () => undefined,
    nextState: 'save_archive_entries_from_assets_map',
  },
  save_archive_entries_from_assets_map: {
    onTransitionTo: () => undefined,
    nextState: 'update_so',
  },
  update_so: {
    onTransitionTo: () => undefined,
    nextState: 'end',
  },
};

export async function handleStateMachine(
  startState: string,
  states: StateMachineStates<string>,
  context: any // TODO: find better type for this
) {
  await handleState(startState, states, context);
}

async function handleState(
  currentStateName: string,
  states: StateMachineStates<string>,
  context?: any
) {
  const logger = appContextService.getLogger();
  const currentState = states[currentStateName];
  let currentStatus = 'pending';
  let stateResult;

  if (typeof currentState.onTransitionTo === 'function') {
    try {
      stateResult = context
        ? await currentState.onTransitionTo(...context)
        : await currentState.onTransitionTo();
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
  // update SO with current state data
  logger.debug(
    `state: ${currentStateName} - status ${currentStatus} - stateResult: ${stateResult} - nextState: ${currentState.nextState}`
  );
  if (currentStatus === 'success' && currentState?.nextState && currentState?.nextState !== 'end') {
    handleState(currentState.nextState, states, context);
  } else {
    return;
  }
}
