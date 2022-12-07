/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  handleInputAreaState,
  INPUT_DEFAULT_PLACEHOLDER_TEXT,
} from './state_update_handlers/handle_input_area_state';
import { handleSidePanel } from './state_update_handlers/handle_side_panel';
import { handleUpdateCommandState } from './state_update_handlers/handle_update_command_state';
import type { ConsoleDataState, ConsoleStoreReducer } from './types';
import { handleExecuteCommand } from './state_update_handlers/handle_execute_command';
import { getBuiltinCommands } from '../../service/builtin_commands';

export type InitialStateInterface = Pick<
  ConsoleDataState,
  | 'commands'
  | 'scrollToBottom'
  | 'dataTestSubj'
  | 'HelpComponent'
  | 'managedKey'
  | 'keyCapture'
  | 'storagePrefix'
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
    footerContent: '',
    input: {
      textEntered: '',
      rightOfCursor: { text: '' },
      commandEntered: '',
      placeholder: INPUT_DEFAULT_PLACEHOLDER_TEXT,
      showPopover: undefined,
      history: [],
      visibleState: undefined,
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
  let newState = state;

  switch (action.type) {
    case 'scrollDown':
      state.scrollToBottom();
      break;

    case 'addFocusToKeyCapture':
      state.keyCapture?.current?.focus();
      break;

    case 'removeFocusFromKeyCapture':
      state.keyCapture?.current?.blur();
      break;

    case 'updateFooterContent':
      if (state.footerContent !== action.payload.value) {
        newState = { ...state, footerContent: action.payload.value };
      }
      break;

    case 'executeCommand':
      newState = handleExecuteCommand(state, action);
      break;

    case 'updateCommandStatusState':
    case 'updateCommandStoreState':
      newState = handleUpdateCommandState(state, action);
      break;

    case 'showSidePanel':
      newState = handleSidePanel(state, action);
      break;

    case 'updateInputPopoverState':
    case 'updateInputHistoryState':
    case 'clearInputHistoryState':
    case 'updateInputTextEnteredState':
    case 'updateInputPlaceholderState':
    case 'setInputState':
      newState = handleInputAreaState(state, action);
      break;

    case 'clear':
      newState = { ...state, commandHistory: [] };
      break;
  }

  return newState;
};
