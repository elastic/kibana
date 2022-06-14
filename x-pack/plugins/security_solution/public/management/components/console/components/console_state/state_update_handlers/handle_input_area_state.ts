/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { ConsoleDataAction, ConsoleStoreReducer } from '../types';

type InputAreaStateAction = ConsoleDataAction & {
  type: 'updateInputPopoverState' | 'updateInputHistoryState';
};

export const handleInputAreaState: ConsoleStoreReducer<InputAreaStateAction> = (
  state,
  { type, payload }
) => {
  switch (type) {
    case 'updateInputPopoverState':
      if (state.input.showPopover !== payload.show) {
        return {
          ...state,
          input: {
            ...state.input,
            showPopover: payload.show,
          },
        };
      }
      break;

    case 'updateInputHistoryState':
      return {
        ...state,
        input: {
          ...state.input,
          history: [{ id: uuidV4(), input: payload.command }, ...state.input.history],
        },
      };
  }

  return state;
};
