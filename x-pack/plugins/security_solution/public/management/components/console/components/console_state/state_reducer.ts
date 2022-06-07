/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleSidePanel } from './state_update_handlers/handle_side_panel';
import { handleUpdateCommandState } from './state_update_handlers/handle_update_command_state';
import type { ConsoleDataState, ConsoleStoreReducer } from './types';
import { handleExecuteCommand } from './state_update_handlers/handle_execute_command';
import { getBuiltinCommands } from '../../service/builtin_commands';

export type InitialStateInterface = Pick<
  ConsoleDataState,
  'commands' | 'scrollToBottom' | 'dataTestSubj' | 'HelpComponent' | 'managedKey'
>;

export const initiateState = (
  { commands, scrollToBottom, dataTestSubj, HelpComponent, managedKey }: InitialStateInterface,
  managedConsolePriorState?: ConsoleDataState
): ConsoleDataState => {
  const state = managedConsolePriorState ?? {
    commands: getBuiltinCommands().concat(commands),
    scrollToBottom,
    HelpComponent,
    dataTestSubj,
    managedKey,
    commandHistory: [],
    sidePanel: { show: null },
  };

  if (managedConsolePriorState) {
    Object.assign(state, {
      commands: getBuiltinCommands().concat(commands),
      scrollToBottom,
      HelpComponent,
      dataTestSubj,
      managedKey,
    });
  }

  return state;
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

    case 'showSidePanel':
      return handleSidePanel(state, action);

    case 'clear':
      return { ...state, commandHistory: [] };
  }

  return state;
};
