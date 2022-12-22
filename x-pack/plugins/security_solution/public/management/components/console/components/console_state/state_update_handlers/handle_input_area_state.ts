/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidV4 } from 'uuid';
import { getCommandNameFromTextInput } from '../../../service/parsed_command_input';
import type { ConsoleDataAction, ConsoleStoreReducer } from '../types';

export const INPUT_DEFAULT_PLACEHOLDER_TEXT = i18n.translate(
  'xpack.securitySolution.handleInputAreaState.inputPlaceholderText',
  {
    defaultMessage: 'Submit response action',
  }
);

type InputAreaStateAction = ConsoleDataAction & {
  type:
    | 'updateInputPopoverState'
    | 'updateInputHistoryState'
    | 'clearInputHistoryState'
    | 'updateInputTextEnteredState'
    | 'updateInputPlaceholderState'
    | 'setInputState';
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

    case 'clearInputHistoryState':
      return {
        ...state,
        input: {
          ...state.input,
          history: [],
        },
      };

    case 'updateInputTextEnteredState':
      const { textEntered: newTextEntered, rightOfCursor: newRightOfCursor = { text: '' } } =
        typeof payload === 'function'
          ? payload({
              textEntered: state.input.textEntered,
              rightOfCursor: state.input.rightOfCursor,
            })
          : payload;

      if (
        state.input.textEntered !== newTextEntered ||
        state.input.rightOfCursor !== newRightOfCursor
      ) {
        const fullCommandText = newTextEntered + newRightOfCursor.text;
        const commandEntered =
          // If the user has typed a command (some text followed by at space),
          // then parse it to get the command name.
          fullCommandText.trimStart().indexOf(' ') !== -1
            ? getCommandNameFromTextInput(fullCommandText)
            : '';

        return {
          ...state,
          input: {
            ...state.input,
            textEntered: newTextEntered,
            rightOfCursor: newRightOfCursor,
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
      break;

    case 'setInputState':
      if (state.input.visibleState !== payload.value) {
        return {
          ...state,
          input: {
            ...state.input,
            visibleState: payload.value,
          },
        };
      }
      break;
  }

  // No updates needed. Just return original state
  return state;
};
