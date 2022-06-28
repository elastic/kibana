/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useConsoleStore } from '../../components/console_state/console_state';
import type { ConsoleDataState } from '../../components/console_state/types';

type InputTextEntered = Pick<ConsoleDataState['input'], 'textEntered' | 'rightOfCursor'> & {
  fullTextEntered: string;
};

export const useWithInputTextEntered = (): InputTextEntered => {
  const inputState = useConsoleStore().state.input;

  return useMemo(() => {
    return {
      textEntered: inputState.textEntered,
      rightOfCursor: inputState.rightOfCursor,
      fullTextEntered: inputState.textEntered + inputState.rightOfCursor.text,
    };
  }, [inputState.rightOfCursor, inputState.textEntered]);
};
