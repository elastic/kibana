/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CommandExecutionState,
  CommandHistoryItem,
  ConsoleDataAction,
  ConsoleStoreReducer,
} from '../types';

type UpdateCommandStateAction = ConsoleDataAction & {
  type: 'updateCommandStoreState' | 'updateCommandStatusState';
};

export const handleUpdateCommandState: ConsoleStoreReducer<UpdateCommandStateAction> = (
  state,
  { type, payload: { id, value } }
) => {
  let foundIt = false;
  const updatedCommandHistory = state.commandHistory.map((item) => {
    if (foundIt || item.id !== id) {
      return item;
    }

    foundIt = true;

    const updatedCommandState: CommandHistoryItem = {
      ...item,
      state: {
        ...item.state,
      },
    };

    switch (type) {
      case 'updateCommandStoreState':
        updatedCommandState.state.store = (
          value as (prevState: CommandExecutionState['store']) => CommandExecutionState['store']
        )(updatedCommandState.state.store);
        break;
      case 'updateCommandStatusState':
        // If the status was not changed, then there is nothing to be done here, so
        // instead of triggering a state change (and UI re-render), just return the
        // original item;
        if (updatedCommandState.state.status === value) {
          foundIt = false;
          return item;
        }

        updatedCommandState.state.status = value as CommandExecutionState['status'];
        break;
    }

    return updatedCommandState;
  });

  if (foundIt) {
    return {
      ...state,
      commandHistory: updatedCommandHistory,
    };
  }

  return state;
};
