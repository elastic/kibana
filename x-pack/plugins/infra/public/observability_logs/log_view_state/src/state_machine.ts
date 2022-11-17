/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMachine, sendParent } from 'xstate';
import { createTypestateHelpers } from '../../xstate_helpers';
import type { LogViewEvent, LogViewTypestate } from './types';

export const createLogViewStateMachine = () =>
  createMachine<{}, LogViewEvent, LogViewTypestate>(
    {
      id: 'LogView',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: {
            target: 'loading',
          },
        },
        loading: {
          invoke: {
            src: 'loadLogView',
          },
          entry: sendParent({ type: 'loadingLogView' }), // TODO: Sends consumer events (a subset of states)
          on: {
            loadingSucceeded: {
              target: 'resolving',
              actions: ['storeLogView'],
            },
            loadingFailed: {
              target: 'loadingFailed',
              actions: 'storeError',
            },
          },
        },
        resolving: {
          invoke: {
            src: 'resolveLogView',
          },
          on: {
            resolutionSucceeded: {
              target: 'resolved',
              actions: 'storeResolvedLogView',
            },
            resolutionFailed: {
              target: 'resolutionFailed',
              actions: 'storeError',
            },
          },
        },
        resolved: {
          on: {
            reloadLogView: {
              target: 'loading',
            },
          },
        },
        loadingFailed: {
          on: {
            retry: {
              target: 'loading',
            },
          },
        },
        resolutionFailed: {
          on: {
            retry: {
              target: 'resolving',
            },
          },
        },
      },
      on: {
        logViewIdChanged: {
          target: '.loading',
          actions: 'storeLogViewId',
        },
      },
      context: {},
      predictableActionArguments: true,
      preserveActionOrder: true,
    },
    {
      services: {
        loadLogView: (context, event) => (callback, onReceive) => {
          callback({ type: 'loadingSucceeded' });
        },
      },
      actions: {
        storeLogViewId: logViewStateMachineHelpers.assignOnTransition(
          null,
          'loading',
          'logViewIdChanged',
          (_context, event) => ({
            logViewId: event.logViewId,
          })
        ),
        storeLogView: logViewStateMachineHelpers.assignOnTransition(
          'loading',
          'resolving',
          'loadingSucceeded',
          (context, event) => ({
            ...context,
            logView: event.logView,
          })
        ),
        storeResolvedLogView: logViewStateMachineHelpers.assignOnTransition(
          'resolving',
          'resolved',
          'resolutionSucceeded',
          (context, event) => ({
            ...context,
            resolvedLogView: event.resolvedLogView,
          })
        ),
      },
    }
  );

const logViewStateMachineHelpers = createTypestateHelpers<LogViewTypestate, LogViewEvent>();
