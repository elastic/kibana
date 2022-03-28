/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConsoleDataState, ConsoleStoreReducer } from './types';
import { handleExecuteCommand } from './state_update_handlers/handle_execute_command';
import { ConsoleBuiltinCommandsService } from '../../service/builtin_command_service';

export type InitialStateInterface = Pick<
  ConsoleDataState,
  'commandService' | 'scrollToBottom' | 'dataTestSubj'
>;

export const initiateState = ({
  commandService,
  scrollToBottom,
  dataTestSubj,
}: InitialStateInterface): ConsoleDataState => {
  return {
    commandService,
    scrollToBottom,
    dataTestSubj,
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
