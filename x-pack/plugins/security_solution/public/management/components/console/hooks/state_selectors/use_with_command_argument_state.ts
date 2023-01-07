/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useConsoleStore } from '../../components/console_state/console_state';
import type { CommandArgumentState } from '../../components/console_state/types';

/**
 * Returns the Command argument state for a given argument name. Should be used ONLY when a
 * command has been entered that matches a `CommandDefinition`
 * @param argName
 */
export const useWithCommandArgumentState = (argName: string): CommandArgumentState => {
  const enteredCommand = useConsoleStore().state.input.enteredCommand;

  return useMemo(() => {
    return enteredCommand && enteredCommand.argState[argName] && enteredCommand.argState[argName][0]
      ? enteredCommand.argState[argName][0]
      : {
          value: undefined,
          valueText: '',
        };
  }, [argName, enteredCommand]);
};
