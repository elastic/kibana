/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, Reducer } from 'react';
import type { CommandInputProps } from '../command_input';
import type { Command, CommandDefinition, CommandExecutionComponent } from '../../types';

export interface ConsoleDataState {
  /**
   * Commands available in the console, which includes both the builtin command and the ones
   * defined on input to the `Console` component by consumers of the component
   */
  commands: CommandDefinition[];

  /** UI function that scrolls the console down to the bottom */
  scrollToBottom: () => void;

  /** UI interface that places allows interaction with the `KeyCapture` component */
  keyCapture: CommandInputProps['focusRef'];

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

  /** The local storage prefix for saving/persisting data associated with the console */
  storagePrefix?: string;

  /** The key for the console when it is under ConsoleManager control */
  managedKey?: symbol;

  /** content for the console's footer area */
  footerContent: string;

  /** state for the command input area */
  input: {
    /**
     * The text the user is typing into the console input area. By default, this
     * value goes into the left of the cursor position
     */
    textEntered: string; // FIXME:PT convert this to same structure as `rightOfCursor`

    rightOfCursor: {
      text: string;
    };

    /** The command name that was entered (derived from `textEntered` */
    commandEntered: string;

    /** Placeholder text for the input area **/
    placeholder: string;

    /** A history of commands entered by the user */
    history: InputHistoryItem[];

    /** Show the input area popover */
    showPopover: 'input-history' | undefined; // Other values will exist in the future

    /** The state of the input area. Set to `error` if wanting to show it as being in error state */
    visibleState: 'error' | undefined;
  };
}

export interface InputHistoryItem {
  id: string;
  input: string;
}

export interface CommandHistoryItem {
  id: string;
  enteredAt: string;
  isValid: boolean;
  command: Command;
  state: CommandExecutionState;
}

export interface CommandExecutionState {
  status: 'pending' | 'success' | 'error';
  store: Record<string, unknown>;
}

export type ConsoleDataAction =
  | { type: 'scrollDown' }
  | { type: 'addFocusToKeyCapture' }
  | { type: 'removeFocusFromKeyCapture' }
  | { type: 'executeCommand'; payload: { input: string } }
  | { type: 'clear' }
  | {
      type: 'showSidePanel';
      payload: { show: ConsoleDataState['sidePanel']['show'] };
    }
  | {
      type: 'updateFooterContent';
      payload: { value: string };
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
      payload: PayloadValueOrFunction<{
        textEntered: string;
        /** When omitted, the right side of the cursor value will be blanked out */
        rightOfCursor?: ConsoleDataState['input']['rightOfCursor'];
      }>;
    }
  | {
      type: 'updateInputPopoverState';
      payload: {
        show: ConsoleDataState['input']['showPopover'];
      };
    }
  | {
      type: 'updateInputPlaceholderState';
      payload: {
        placeholder: ConsoleDataState['input']['placeholder'];
      };
    }
  | {
      type: 'setInputState';
      payload: {
        value: ConsoleDataState['input']['visibleState'];
      };
    }
  | {
      type: 'updateInputHistoryState';
      payload: {
        command: string;
      };
    }
  | {
      type: 'clearInputHistoryState';
      payload?: never;
    };

type PayloadValueOrFunction<T extends object = object> = T | ((options: Required<T>) => T);

export interface ConsoleStore {
  state: ConsoleDataState;
  dispatch: Dispatch<ConsoleDataAction>;
}

export type ConsoleStoreReducer<A extends ConsoleDataAction = ConsoleDataAction> = Reducer<
  ConsoleDataState,
  A
>;
