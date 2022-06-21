/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidV4 } from 'uuid';
import { getCommandNameFromTextInput } from '../../../service/parsed_command_input';
import { ConsoleDataAction, ConsoleStoreReducer } from '../types';

export const INPUT_DEFAULT_PLACEHOLDER_TEXT = i18n.translate(
  'xpack.securitySolution.handleInputAreaState.inputPlaceholderText',
  {
    defaultMessage:
      'Click here to type and submit an action. For assistance, use the "help" action',
  }
);

type InputAreaStateAction = ConsoleDataAction & {
  type:
    | 'updateInputPopoverState'
    | 'updateInputHistoryState'
    | 'updateInputTextEnteredState'
    | 'updateInputPlaceholderState';
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
          // Keeping the last 100 entries only for now
          history: [{ id: uuidV4(), input: payload.command }, ...state.input.history.slice(0, 99)],
        },
      };

    case 'updateInputTextEnteredState':
      const newTextEntered =
        typeof payload.textEntered === 'function'
          ? payload.textEntered(state.input.textEntered)
          : payload.textEntered;

      if (state.input.textEntered !== newTextEntered) {
        const textEntered = newTextEntered;
        const commandEntered =
          // If the user has typed a command (some text followed by at space),
          // then parse it to get the command name.
          textEntered.trimStart().indexOf(' ') !== -1
            ? getCommandNameFromTextInput(newTextEntered)
            : '';

        return {
          ...state,
          input: {
            ...state.input,
            textEntered,
            commandEntered,
          },
        };
      }
      break;

    case 'updateInputPlaceholderState':
      if (state.input.placeholder !== payload.placeholder) {
        return {
          ...state,
          input: {
            ...state.input,
            placeholder: payload.placeholder || INPUT_DEFAULT_PLACEHOLDER_TEXT,
          },
        };
      }
  }

  // No updates needed. Just return original state
  return state;
};
