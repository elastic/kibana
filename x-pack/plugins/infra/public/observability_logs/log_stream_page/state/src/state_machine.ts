/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMachine } from 'xstate';
import { LogStreamPageContext, LogStreamPageEvent } from './types';

export const createLogStreamPageStateMachine = () =>
  createMachine(
    {
      schema: {
        context: {} as LogStreamPageContext,
        events: {} as LogStreamPageEvent,
      },
      initial: 'uninitialized',
      context: {
        logViewError: null,
      },
      states: {
        uninitialized: {
          always: { target: 'loadingLogView' },
        },
        loadingLogView: {},
        loadingLogViewFailed: {},
        hasLogView: {},
      },
      predictableActionArguments: true,
    },
    {
      services: {},
    }
  );
