/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMachine } from 'xstate';
import {
  LogStreamQueryContext,
  LogStreamQueryContextWithDefaultQuery,
  LogStreamQueryEvent,
  LogStreamQueryTypestate,
} from './types';

export const createPureLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDefaultQuery
) =>
  createMachine<LogStreamQueryContext, LogStreamQueryEvent, LogStreamQueryTypestate>({
    id: 'Query',
    initial: 'uninitialized',
    states: {
      uninitialized: {
        always: {
          target: 'hasQuery',
          actions: ['initializeFromUrl', 'populateUrl'],
        },
      },
      hasQuery: {
        invoke: {
          src: 'subscribeToUrlStateStorageChanges',
        },
        initial: 'start',
        states: {
          valid: {
            entry: 'notifyValidQueryChanged',
          },
          invalid: {
            entry: 'notifyInvalidQueryChanged',
          },
          start: {
            always: [
              {
                target: 'valid',
                cond: 'isValid',
                actions: 'storeValidQuery',
              },
              {
                target: 'invalid',
                actions: 'storeInvalidQuery',
              },
            ],
          },
        },
        on: {
          queryFromUiChanged: [
            {
              target: '.valid',
              cond: 'isValid',
              actions: ['updateUrl', 'storeValidQuery'],
            },
            {
              target: '.invalid',
              actions: ['updateUrl', 'storeInvalidQuery'],
            },
          ],
          queryFromUrlChanged: [
            {
              target: '.valid',
              cond: 'isValid',
              actions: 'storeValidQuery',
            },
            {
              target: '.invalid',
              actions: 'storeInvalidQuery',
            },
          ],
        },
      },
    },
    context: initialContext,
    predictableActionArguments: true,
    preserveActionOrder: true,
  });
