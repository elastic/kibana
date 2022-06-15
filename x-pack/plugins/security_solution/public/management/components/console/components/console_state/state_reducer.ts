/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleInputAreaState } from './state_update_handlers/handle_input_area_state';
import { handleSidePanel } from './state_update_handlers/handle_side_panel';
import { handleUpdateCommandState } from './state_update_handlers/handle_update_command_state';
import type { ConsoleDataState, ConsoleStoreReducer } from './types';
import { handleExecuteCommand } from './state_update_handlers/handle_execute_command';
import { getBuiltinCommands } from '../../service/builtin_commands';

export type InitialStateInterface = Pick<
  ConsoleDataState,
  'commands' | 'scrollToBottom' | 'dataTestSubj' | 'HelpComponent' | 'managedKey' | 'keyCapture'
>;

export const initiateState = (
  { commands: userCommandList, ...otherOptions }: InitialStateInterface,
  managedConsolePriorState?: ConsoleDataState
): ConsoleDataState => {
  const commands = getBuiltinCommands().concat(userCommandList);
  const state = managedConsolePriorState ?? {
    commands,
    ...otherOptions,
    commandHistory: [],
    sidePanel: { show: null },
    input: {
      textEntered: '',
      showPopover: undefined,
      history: [],
    },
  };

  // If we have prior state from ConsoleManager, then ensure that its updated
  // with the initial state provided by `Console` during initial render so that
  // we don't reference stale references.
  if (managedConsolePriorState) {
    Object.assign(state, {
      commands,
      ...otherOptions,
    });
  }

  return state;
};

export const stateDataReducer: ConsoleStoreReducer = (state, action) => {
  switch (action.type) {
    case 'scrollDown':
      state.scrollToBottom();
      return state;

    case 'addFocusToKeyCapture':
      state.keyCapture?.current?.focus();
      return state;

    case 'executeCommand':
      return handleExecuteCommand(state, action);

    case 'updateCommandStatusState':
    case 'updateCommandStoreState':
      return handleUpdateCommandState(state, action);

    case 'showSidePanel':
      return handleSidePanel(state, action);

    case 'updateInputPopoverState':
    case 'updateInputHistoryState':
    case 'updateInputTextEnteredState':
      return handleInputAreaState(state, action);

    case 'clear':
      return { ...state, commandHistory: [] };
  }

  return state;
};
