/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, Reducer } from 'react';
import type { Command, CommandDefinition, CommandExecutionComponent } from '../../types';

export interface ConsoleDataState {
  /**
   * Commands available in the console, which includes both the builtin command and the ones
   * defined on input to the `Console` component by consumers of the component
   */
  commands: CommandDefinition[];

  /** UI function that scrolls the console down to the bottom */
  scrollToBottom: () => void;

  /** UI function that places focus on the Input area of the console (show cursor blinking) */
  focusOnInputArea: () => void;

  /**
   * List of commands entered by the user and being shown in the UI
   */
  commandHistory: CommandHistoryItem[];

  sidePanel: {
    show: null | 'help'; // will have other values in the future
  };

  /** Component defined on input to the Console that will handle the `help` command */
  HelpComponent?: CommandExecutionComponent;

  dataTestSubj?: string;

  /** The key for the console when it is under ConsoleManager control */
  managedKey?: symbol;

  /** state for the command input area */
  input: {
    /** The text the user is typing into the console input area */
    textEntered: string;

    /** A history of commands entered by the user */
    history: InputHistoryItem[];

    /** Show the input area popover */
    showPopover: 'input-history' | undefined; // Other values will exist in the future
  };
}

export interface InputHistoryItem {
  id: string;
  input: string;
}

export interface CommandHistoryItem {
  id: string;
  command: Command;
  state: CommandExecutionState;
}

export interface CommandExecutionState {
  status: 'pending' | 'success' | 'error';
  store: Record<string, unknown>;
}

export type ConsoleDataAction =
  | { type: 'scrollDown' }
  | { type: 'focusOnInputArea' }
  | { type: 'executeCommand'; payload: { input: string } }
  | { type: 'clear' }
  | {
      type: 'showSidePanel';
      payload: { show: ConsoleDataState['sidePanel']['show'] };
    }
  | {
      type: 'updateCommandStoreState';
      payload: {
        id: string;
        value: (prevState: CommandExecutionState['store']) => CommandExecutionState['store'];
      };
    }
  | {
      type: 'updateCommandStatusState';
      payload: { id: string; value: CommandExecutionState['status'] };
    }
  | {
      type: 'updateInputTextEnteredState';
      payload: {
        textEntered: string;
      };
    }
  | {
      type: 'updateInputPopoverState';
      payload: {
        show: ConsoleDataState['input']['showPopover'];
      };
    }
  | {
      type: 'updateInputHistoryState';
      payload: {
        command: string;
      };
    };

export interface ConsoleStore {
  state: ConsoleDataState;
  dispatch: Dispatch<ConsoleDataAction>;
}

export type ConsoleStoreReducer<A extends ConsoleDataAction = ConsoleDataAction> = Reducer<
  ConsoleDataState,
  A
>;
