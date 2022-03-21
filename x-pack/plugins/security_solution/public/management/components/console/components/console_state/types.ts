/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, Reducer } from 'react';
import { CommandServiceInterface } from '../../types';
import { HistoryItemComponent } from '../history_item';
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
  commandHistory: Array<ReturnType<HistoryItemComponent>>;
  dataTestSubj?: string;
}

export type ConsoleDataAction =
  | { type: 'scrollDown' }
  | { type: 'executeCommand'; payload: { input: string } };

export interface ConsoleStore {
  state: ConsoleDataState;
  dispatch: Dispatch<ConsoleDataAction>;
}

export type ConsoleStoreReducer<A extends ConsoleDataAction = ConsoleDataAction> = Reducer<
  ConsoleDataState,
  A
>;
