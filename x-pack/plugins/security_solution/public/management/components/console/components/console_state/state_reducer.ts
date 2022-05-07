/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleUpdateCommandState } from './state_update_handlers/handle_update_command_state';
import type { ConsoleDataState, ConsoleStoreReducer } from './types';
import { handleExecuteCommand } from './state_update_handlers/handle_execute_command';
import { getBuiltinCommands } from '../../service/builtin_commands';

export type InitialStateInterface = Pick<
  ConsoleDataState,
  'commands' | 'scrollToBottom' | 'dataTestSubj' | 'HelpComponent'
>;

export const initiateState = ({
  commands,
  scrollToBottom,
  dataTestSubj,
  HelpComponent,
}: InitialStateInterface): ConsoleDataState => {
  return {
    commands: getBuiltinCommands().concat(commands),
    scrollToBottom,
    HelpComponent,
    dataTestSubj,
    commandHistory: [],
  };
};

export const stateDataReducer: ConsoleStoreReducer = (state, action) => {
  switch (action.type) {
    case 'scrollDown':
      state.scrollToBottom();
      return state;

    case 'executeCommand':
      return handleExecuteCommand(state, action);

    case 'updateCommandStatusState':
    case 'updateCommandStoreState':
      return handleUpdateCommandState(state, action);

    case 'clear':
      return { ...state, commandHistory: [] };
  }

  return state;
};
