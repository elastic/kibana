/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { State } from 'xstate';
import { LogExplorerProfileStateService } from './state_machine';
import {
  LogExplorerProfileContext,
  LogExplorerProfileEvent,
  LogExplorerProfileState,
} from './types';

type ListenerState = State<LogExplorerProfileContext, LogExplorerProfileEvent>;

export const waitForState = (
  service: LogExplorerProfileStateService,
  targetState: LogExplorerProfileState
) => {
  return new Promise((resolve) => {
    const listener = (state: ListenerState) => {
      if (state.matches(targetState)) {
        resolve(state);
        service.off(listener);
      }
    };

    service.onTransition(listener);
  });
};
