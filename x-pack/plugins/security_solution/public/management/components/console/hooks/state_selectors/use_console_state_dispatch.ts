/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useConsoleStore } from '../../components/console_state/console_state';
import { ConsoleStore } from '../../components/console_state/types';

export const useConsoleStateDispatch = (): ConsoleStore['dispatch'] => {
  return useConsoleStore().dispatch;
};
