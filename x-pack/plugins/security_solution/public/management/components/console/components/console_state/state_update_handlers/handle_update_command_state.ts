/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleDataAction, ConsoleStoreReducer } from '../types';

export const handleUpdateCommandState: ConsoleStoreReducer<
  ConsoleDataAction & { type: 'updateCommandState' }
> = (state, { payload: { id, state: commandState } }) => {
  let foundIt = false;
  const updatedCommandHistory = state.commandHistory.map((item) => {
    if (foundIt || item.id !== id) {
      return item;
    }

    foundIt = true;

    return {
      ...item,
      state: commandState,
    };
  });

  if (foundIt) {
    return {
      ...state,
      commandHistory: updatedCommandHistory,
    };
  }

  return state;
};
