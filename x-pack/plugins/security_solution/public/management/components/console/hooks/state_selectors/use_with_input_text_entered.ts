/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useConsoleStore } from '../../components/console_state/console_state';
import type { ConsoleDataState } from '../../components/console_state/types';

type InputTextEntered = Pick<
  ConsoleDataState['input'],
  'leftOfCursorText' | 'rightOfCursorText' | 'parsedInput' | 'enteredCommand'
> & {
  fullTextEntered: string;
};

export const useWithInputTextEntered = (): InputTextEntered => {
  const { leftOfCursorText, rightOfCursorText, parsedInput, enteredCommand } =
    useConsoleStore().state.input;

  return useMemo(() => {
    return {
      leftOfCursorText,
      rightOfCursorText,
      parsedInput,
      enteredCommand,
      fullTextEntered: leftOfCursorText + rightOfCursorText,
    };
  }, [enteredCommand, leftOfCursorText, parsedInput, rightOfCursorText]);
};
