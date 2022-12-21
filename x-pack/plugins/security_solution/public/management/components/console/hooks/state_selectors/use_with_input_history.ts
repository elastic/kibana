/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleDataState } from '../../components/console_state/types';
import { useConsoleStore } from '../../components/console_state/console_state';

export const useWithInputHistory = (): ConsoleDataState['input']['history'] => {
  return useConsoleStore().state.input.history;
};
