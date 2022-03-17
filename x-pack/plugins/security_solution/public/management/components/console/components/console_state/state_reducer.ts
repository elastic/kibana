/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConsoleDataState, ConsoleStoreReducer } from './types';
import { handleExecuteCommand } from './state_update_handlers/handle_execute_command';
import { ConsoleBuiltinCommandsService } from '../../builtins/commands_handler_service';

export type InitialStateInterface = Pick<ConsoleDataState, 'commandService' | 'scrollToBottom'>;

export const initiateState = ({
  commandService,
  scrollToBottom,
}: InitialStateInterface): ConsoleDataState => {
  return {
    commandService,
    scrollToBottom,
    commandHistory: [],
    builtinCommandService: new ConsoleBuiltinCommandsService(),
  };
};

export const stateDataReducer: ConsoleStoreReducer = (state, action) => {
  switch (action.type) {
    case 'scrollDown':
      state.scrollToBottom();
      return state;

    case 'executeCommand':
      return handleExecuteCommand(state, action);
  }

  return state;
};
