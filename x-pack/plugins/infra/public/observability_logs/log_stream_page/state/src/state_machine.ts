/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMachine, assign, spawn, SpecialTargets } from 'xstate';
import { LogStreamPageEvent, LogStreamPageStateContext, LogStreamPageTypestate } from './types';
import { createLogViewStateMachine, logViewListenerEventSelectors } from '../../../log_view_state';
import { ILogViewsClient } from '../../../../services/log_views';
import { sendIfDefined } from '../../../xstate_helpers';

const MACHINE_ID = 'logStreamPageState';

export const createLogStreamPageStateMachine = ({
  logViews,
  logViewId,
}: {
  logViews: ILogViewsClient;
  logViewId: string;
}) => {
  return createMachine<LogStreamPageStateContext, LogStreamPageEvent, LogStreamPageTypestate>(
    {
      id: MACHINE_ID,
      initial: 'uninitialized',
      states: {
        uninitialized: {
          entry: ['spawnLogViewMachine'],
          on: {
            loadingLogViewStarted: 'loadingLogView',
            loadingLogViewFailed: 'loadingLogViewFailed',
            loadingLogViewSucceeded: [
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
            loadingLogViewFailed: 'loadingLogViewFailed',
            loadingLogViewSucceeded: [
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
          on: {
            loadingLogViewStarted: 'loadingLogView',
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
          event.type === 'loadingLogViewSucceeded' &&
          ['empty', 'available'].includes(event.status.index),
      },
      actions: {
        spawnLogViewMachine: assign({
          // Assigned to context for the lifetime of this machine
          logViewMachineRef: () =>
            spawn(
              createLogViewStateMachine({
                initialContext: {
                  logViewId,
                },
                logViews,
              }).withConfig({
                actions: {
                  notifyLoadingStarted: sendIfDefined(SpecialTargets.Parent)(
                    logViewListenerEventSelectors.loadingLogViewStarted
                  ),
                  notifyLoadingSucceeded: sendIfDefined(SpecialTargets.Parent)(
                    logViewListenerEventSelectors.loadingLogViewSucceeded
                  ),
                  notifyLoadingFailed: sendIfDefined(SpecialTargets.Parent)(
                    logViewListenerEventSelectors.loadingLogViewFailed
                  ),
                },
              }),
              'logViewMachine'
            ),
        }),
      },
    }
  );
};
