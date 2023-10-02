/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogExplorerProfileStateService } from './state_machine';
import { LogExplorerProfileStateValue } from './types';

export const waitForState = (
  service: LogExplorerProfileStateService,
  targetState: LogExplorerProfileStateValue
) => {
  return new Promise((resolve) => {
    const { unsubscribe } = service.subscribe((state) => {
      if (state.matches(targetState)) {
        resolve(state);
        unsubscribe();
      }
    });
  });
};
