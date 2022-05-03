/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, Reducer } from 'react';
import type { Command, CommandServiceInterface } from '../../types';
import { BuiltinCommandServiceInterface } from '../../service/types.builtin_command_service';

export interface ConsoleDataState {
  /** Command service defined on input to the `Console` component by consumers of the component */
  commandService: CommandServiceInterface;
  /** Command service for builtin console commands */
  builtinCommandService: BuiltinCommandServiceInterface;
  /** UI function that scrolls the console down to the bottom */
  scrollToBottom: () => void;
  /**
   * List of commands entered by the user and being shown in the UI
   */
  commandHistory: CommandHistoryItem[];
  dataTestSubj?: string;
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
  | { type: 'executeCommand'; payload: { input: string } }
  | { type: 'clear' }
  | {
      type: 'updateCommandStoreState';
      payload: { id: string; value: CommandExecutionState['store'] };
    }
  | {
      type: 'updateCommandStatusState';
      payload: { id: string; value: CommandExecutionState['status'] };
    };

export interface ConsoleStore {
  state: ConsoleDataState;
  dispatch: Dispatch<ConsoleDataAction>;
}

export type ConsoleStoreReducer<A extends ConsoleDataAction = ConsoleDataAction> = Reducer<
  ConsoleDataState,
  A
>;
