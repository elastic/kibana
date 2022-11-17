/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMachine, assign, spawn } from 'xstate';
import { LogStreamPageContext, LogStreamPageEvent } from './types';
import { createLogViewStateMachine } from '../../../log_view_state';

const testLogViewActor = (callback, receive) => {
  callback({ type: 'loadingLogView' });

  setTimeout(() => {
    callback({
      type: 'loadedAndResolvedLogViewWithStatus',
      logViewStatus: {
        index: 'available',
      },
    });
  }, 5000);

  setTimeout(() => {
    callback({
      type: 'loadingLogViewFailed',
      error: 'Uh oh',
    });
  }, 15000);

  // Parent to child
  receive((event) => {});

  return () => {
    // Cleanup
  };
};

export const createLogStreamPageStateMachine = () =>
  createMachine(
    {
      schema: {
        context: {} as LogStreamPageContext,
        events: {} as LogStreamPageEvent,
      },
      initial: 'uninitialized',
      context: {
        logViewMachineRef: null,
        logView: null, // Duplicate here or access through context ref?
        resolvedLogView: null,
        logViewStatus: null,
        logViewError: null,
      },
      states: {
        uninitialized: {
          entry: ['spawnLogViewMachine'],
          on: {
            loadingLogView: 'loadingLogView',
            failedLoadingLogView: 'loadingLogViewFailed',
            loadedAndResolvedLogViewWithStatus: [
              {
                target: 'hasLogViewIndices',
                cond: 'hasLogViewIndices',
              },
              {
                target: 'missingLogViewIndices',
              },
            ],
          },
        },
        loadingLogView: {
          on: {
            failedLoadingLogView: 'loadingLogViewFailed',
            loadedAndResolvedLogViewWithStatus: [
              {
                target: 'hasLogViewIndices',
                cond: 'hasLogViewIndices',
              },
              {
                target: 'missingLogViewIndices',
              },
            ],
          },
        },
        loadingLogViewFailed: {
          entry: ['assignLogViewError'],
          exit: ['resetLogViewError'],
          on: {
            loadingLogView: 'loadingLogView',
          },
        },
        hasLogViewIndices: {
          initial: 'uninitialized',
          states: {
            uninitialized: {
              // TODO: Invoke actor to wait for all parameters
              on: {
                receivedAllParameters: 'initialized',
              },
            },
            initialized: {
              // Would invoke LogEntries and LogHistogram machines, with relevant context.
            },
          },
        },
        missingLogViewIndices: {},
      },
      predictableActionArguments: true,
    },
    {
      services: {},
      guards: {
        hasLogViewIndices: (context, event) =>
          ['available', 'empty'].includes(event.logViewStatus.index),
      },
      actions: {
        spawnLogViewMachine: assign({
          // Assigned to context for the lifetime of this machine
          logViewMachineRef: () => spawn(createLogViewStateMachine(), 'logViewMachine'),
        }),
        assignLogViewError: assign({
          logViewError: (context, event) => event.logViewError,
        }),
        resetLogViewError: assign({
          logViewError: null,
        }),
      },
    }
  );
