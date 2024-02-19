/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshInterval } from '@kbn/data-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { actions, ActorRefFrom, createMachine, EmittedFrom } from 'xstate';
import { DEFAULT_REFRESH_INTERVAL } from '@kbn/logs-shared-plugin/common';
import type { LogViewNotificationChannel } from '@kbn/logs-shared-plugin/public';
import { datemathToEpochMillis } from '../../../../utils/datemath';
import { createLogStreamPositionStateMachine } from '../../../log_stream_position_state/src/state_machine';
import {
  createLogStreamQueryStateMachine,
  DEFAULT_TIMERANGE,
  LogStreamQueryStateMachineDependencies,
} from '../../../log_stream_query_state';
import { OmitDeprecatedState } from '../../../xstate_helpers';
import {
  waitForInitialQueryParameters,
  waitForInitialPositionParameters,
} from './initial_parameters_service';
import type {
  LogStreamPageContext,
  LogStreamPageContextWithLogView,
  LogStreamPageContextWithLogViewError,
  LogStreamPageContextWithPositions,
  LogStreamPageContextWithQuery,
  LogStreamPageContextWithTime,
  LogStreamPageEvent,
  LogStreamPageTypestate,
} from './types';

export const createPureLogStreamPageStateMachine = (initialContext: LogStreamPageContext = {}) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKAXATmAhgLYAK+M2+WYAdAK4B2Alk1o-sowF6QDEAMgHkAggBEAkgDkA4gH1BsgGpiAogHUZGACpCASpuUiA2gAYAuolAAHVLEatU9CyAAeiAOwAmADQgAnogAOAE4PagA2YyCAZiCAViDjN0S3KIBfVJ80TFwCEjIwCio6JhY2Dm4IfmFxaTkBRRV1ADEhMT4DE3MkEGtbe0du1wQARmjqAOGPABYgtzcA2LCgkKmffwQPaeo4qOMoian9qfTM9Gw8IlJyLEoaBmY7Mq5eQVFJWXkZJTUNAFUAYX+ygMHTMTl6jwcTiGnjWiCCh2ow0iMQ8UTCEQxQROICy51yVwKNyK91K7GelVeNQ+9S+jT+gOBIg6wy6VhskIGoCGwwCUXGkxmcwWSxWcJGHgC1Bmy15izCUWGnhxeJyl3yhRoaHwEGYUD46AUjDAAHcqm9ap9vs1Wu0jGDuhD+tDELswkidlFFnMPMMpgE3OKwm5YtLjGEPPNkcZjPFsRlcWc1XlrrdqNrdfR9YbjWaqe86g0fhgAUCQfa2T0Oc7Bu43O7eSHjJtY7FFkFxXM3NRvW4EglYrzYyqkxcU0S0xm9QaoEbTebqYW6cXS0yWZWnYwobWEHMGwHYs2PK320GJki-W3Iv6ghFYiPsmPCZr06gddOc6amvhGMgXtUCytektF0fQK3Basty5FxXXDD1YiiL1g08P0A07NxhnGeIYnrOZYgCSMH3xdVUyKAALfBYBnOcTTEehdQAYzgagHlYclOD1ABFWgwBwXweB0ZQgTEBQDBkSQxE0MQhD4GRON+ZQdAATRkYhdCEABZZR9B0DBOggvooJdBB-SlGNzKVMJYi7VY-EQFtMN9FElQCMI+WOBNVSfDViRoCiqM-Wj6MYJjYBYslyi4ni+J4BQZLEEQ5IU5SZH+AAJIRpFBDdIO3blEGGRZqDmRCAimcqI1mazxV9JUkQPYZkRlKJCM80cCR8tN-Oo3M6MY5jWKeDis243j+MkOK+ASpLFJU9LMqkbKDM5YzCvdEqjgqjwqsDOyNmbYxiqiQ4gj9TwpkiNwiOTZ9fOobrAr6kKBoirgorGngpK01KMqy8DHVy6CeSKjayq2nbxVGLZJUmDDglMjDru80i-MonrTSe0Lwsedi9WIQHYAEoTlBEsSJKkmTVIEDBJLEAQJFU9StJ0vSHXZQy8pgiUpndQ8+zRFJ6zK3b1k2HnpWGGIsQmTxbyRjqUfutHHuCrHBtxrN8Y5+hCeIanafpjAfoWpaAe14z+2Kw9jAWMr+02GrJdDQ48Owvd5ZIidyOV2detVl6cfKXhJum+TZuNv79LNlad2GMJESmBDjtvW8UgVR2Q3CA9JRDY9mw805HwVr3UYC32Mf9sL1aDyovuUCPFv+9mY-ykYMX5YxRiSRUpg8Qdbxq2NQhhvuSsljwPfHF8HvLoL+qr16Kh4PWaakw2G9N5ua1buOEOoY6Y1iY9ljRI-IbiUMCImfZCqiPsrraovPenn2aMxgO2JrngAClfg04gZCaAEIA3Qi1NBU1XnTCQUct5GVjhGKU8cpieC9J3SIkpIYLCCPvJscp6yRl7pPW6XVX5+3ntjT+FIiZ6z0HSGmAAhdoECDYSFZjlc28DdjUG2oqYI+xEjRDCJDfB2xfTBGCEEBqD9C7ESnndGeb9K4UKGrwX4xARBCH0IAsQ30dAmxgVWDhO945mUjGEUYEw0Rx0hhid0PMAx9l7pMSUYQiGdW9mXRR5Dq5ULURorRgkmiCQwGlcSEgdKTQMZuTmPIEFIkiPHTup04gIkhtZQ6ndFjxDKnfcMbjFYKLIc9BegcqFqUWjIZQEhEr0N+E0JoikZCCSEOlTehiW5czjn3fe8R8IBAWBdOUkNkH8kWH3C6HgMS8jSDiegqAIBwCcF5Yumplrby5gAWiEXtLZ+SS7FB8RUNZcDW69xqkfbhfYrI7D5LEKYSo9kvinFmdGJpjkxMQHeaUOSAzRFvIOWInZGrUBjPMfYcwLopHjDIm67itRvkzNmWe35fyQHeUDQIIt3DGCmNKKZ5186nXvI-WRxCPGvPfvAaO6yhjlUhoqDuEZDxlWbNZBEjz5GkIrt4xe70+Loott4PamxeThAugqcMBC2wzJhcjfZhTuXFOURrKAWtORUtgR8hACxDp8xCF3UYiQog1TRO6YI4ZjohnmP01xJLYUFK5XPJVhy0XUpOZ0pIoQYgjNPoVAZJq5hInFf6FqcQ+4crTIQRgsBbAvJVvPAVO45iQ0jKEMZg5RiHHiOkdIQA */
  createMachine<LogStreamPageContext, LogStreamPageEvent, LogStreamPageTypestate>(
    {
      context: initialContext,
      predictableActionArguments: true,
      invoke: {
        src: 'logViewNotifications',
      },
      id: 'logStreamPageState',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          on: {
            LOADING_LOG_VIEW_STARTED: {
              target: 'loadingLogView',
            },
            LOADING_LOG_VIEW_FAILED: {
              target: 'loadingLogViewFailed',
              actions: 'storeLogViewError',
            },
            LOADING_LOG_VIEW_SUCCEEDED: [
              {
                target: 'hasLogViewIndices',
                cond: 'hasLogViewIndices',
                actions: 'storeResolvedLogView',
              },
              {
                target: 'missingLogViewIndices',
                actions: 'storeResolvedLogView',
              },
            ],
          },
        },
        loadingLogView: {
          on: {
            LOADING_LOG_VIEW_FAILED: {
              target: 'loadingLogViewFailed',
              actions: 'storeLogViewError',
            },
            LOADING_LOG_VIEW_SUCCEEDED: [
              {
                target: 'hasLogViewIndices',
                cond: 'hasLogViewIndices',
                actions: 'storeResolvedLogView',
              },
              {
                target: 'missingLogViewIndices',
                actions: 'storeResolvedLogView',
              },
            ],
          },
        },
        loadingLogViewFailed: {
          on: {
            LOADING_LOG_VIEW_STARTED: {
              target: 'loadingLogView',
            },
          },
        },
        hasLogViewIndices: {
          initial: 'initializingQuery',

          states: {
            initializingQuery: {
              meta: {
                _DX_warning_:
                  "The Query machine must be invoked and complete initialisation before the Position machine is invoked. This is due to legacy URL dependencies on the 'logPosition' key, we need to read the key before it is reset by the Position machine.",
              },

              invoke: {
                src: 'waitForInitialQueryParameters',
                id: 'waitForInitialQueryParameters',
              },

              on: {
                RECEIVED_INITIAL_QUERY_PARAMETERS: {
                  target: 'initializingPositions',
                  actions: ['storeQuery', 'storeTime', 'forwardToLogPosition'],
                },

                VALID_QUERY_CHANGED: {
                  target: 'initializingQuery',
                  internal: true,
                  actions: 'forwardToInitialQueryParameters',
                },

                INVALID_QUERY_CHANGED: {
                  target: 'initializingQuery',
                  internal: true,
                  actions: 'forwardToInitialQueryParameters',
                },
                TIME_CHANGED: {
                  target: 'initializingQuery',
                  internal: true,
                  actions: 'forwardToInitialQueryParameters',
                },
              },
            },
            initializingPositions: {
              meta: {
                _DX_warning_:
                  "The Position machine must be invoked after the Query machine has been invoked and completed initialisation. This is due to the Query machine having some legacy URL dependencies on the 'logPosition' key, we don't want the Position machine to reset the URL parameters before the Query machine has had a chance to read them.",
              },
              invoke: [
                {
                  src: 'waitForInitialPositionParameters',
                  id: 'waitForInitialPositionParameters',
                },
              ],
              on: {
                RECEIVED_INITIAL_POSITION_PARAMETERS: {
                  target: 'initialized',
                  actions: ['storePositions'],
                },

                POSITIONS_CHANGED: {
                  target: 'initializingPositions',
                  internal: true,
                  actions: 'forwardToInitialPositionParameters',
                },
              },
            },
            initialized: {
              on: {
                VALID_QUERY_CHANGED: {
                  target: 'initialized',
                  internal: true,
                  actions: 'storeQuery',
                },
                TIME_CHANGED: {
                  target: 'initialized',
                  internal: true,
                  actions: ['storeTime', 'forwardToLogPosition'],
                },
                POSITIONS_CHANGED: {
                  target: 'initialized',
                  internal: true,
                  actions: ['storePositions'],
                },
                JUMP_TO_TARGET_POSITION: {
                  target: 'initialized',
                  internal: true,
                  actions: ['forwardToLogPosition'],
                },
                REPORT_VISIBLE_POSITIONS: {
                  target: 'initialized',
                  internal: true,
                  actions: ['forwardToLogPosition'],
                },
                UPDATE_TIME_RANGE: {
                  target: 'initialized',
                  internal: true,
                  actions: ['forwardToLogStreamQuery'],
                },
                UPDATE_REFRESH_INTERVAL: {
                  target: 'initialized',
                  internal: true,
                  actions: ['forwardToLogStreamQuery'],
                },
                PAGE_END_BUFFER_REACHED: {
                  target: 'initialized',
                  internal: true,
                  actions: ['forwardToLogStreamQuery'],
                },
              },
            },
          },

          invoke: [
            {
              src: 'logStreamQuery',
              id: 'logStreamQuery',
            },
            {
              src: 'logStreamPosition',
              id: 'logStreamPosition',
            },
          ],
        },
        missingLogViewIndices: {},
      },
    },
    {
      actions: {
        forwardToInitialQueryParameters: actions.forwardTo('waitForInitialQueryParameters'),
        forwardToInitialPositionParameters: actions.forwardTo('waitForInitialPositionParameters'),
        forwardToLogPosition: actions.forwardTo('logStreamPosition'),
        forwardToLogStreamQuery: actions.forwardTo('logStreamQuery'),
        storeLogViewError: actions.assign((_context, event) =>
          event.type === 'LOADING_LOG_VIEW_FAILED'
            ? ({ logViewError: event.error } as LogStreamPageContextWithLogViewError)
            : {}
        ),
        storeResolvedLogView: actions.assign((_context, event) =>
          event.type === 'LOADING_LOG_VIEW_SUCCEEDED'
            ? ({
                logViewStatus: event.status,
                resolvedLogView: event.resolvedLogView,
              } as LogStreamPageContextWithLogView)
            : {}
        ),
        storeQuery: actions.assign((_context, event) =>
          event.type === 'RECEIVED_INITIAL_QUERY_PARAMETERS'
            ? ({
                parsedQuery: event.validatedQuery,
              } as LogStreamPageContextWithQuery)
            : event.type === 'VALID_QUERY_CHANGED'
            ? ({
                parsedQuery: event.parsedQuery,
              } as LogStreamPageContextWithQuery)
            : {}
        ),
        storeTime: actions.assign((_context, event) => {
          return 'timeRange' in event && 'refreshInterval' in event && 'timestamps' in event
            ? ({
                timeRange: event.timeRange,
                refreshInterval: event.refreshInterval,
                timestamps: event.timestamps,
              } as LogStreamPageContextWithTime)
            : {};
        }),
        storePositions: actions.assign((_context, event) => {
          return 'targetPosition' in event &&
            'visiblePositions' in event &&
            'latestPosition' in event
            ? ({
                targetPosition: event.targetPosition,
                visiblePositions: event.visiblePositions,
                latestPosition: event.latestPosition,
              } as LogStreamPageContextWithPositions)
            : {};
        }),
      },
      guards: {
        hasLogViewIndices: (_context, event) =>
          event.type === 'LOADING_LOG_VIEW_SUCCEEDED' &&
          ['empty', 'available'].includes(event.status.index),
      },
    }
  );

export type LogStreamPageStateMachine = ReturnType<typeof createPureLogStreamPageStateMachine>;
export type LogStreamPageActorRef = OmitDeprecatedState<ActorRefFrom<LogStreamPageStateMachine>>;
export type LogStreamPageState = EmittedFrom<LogStreamPageActorRef>;
export type LogStreamPageSend = LogStreamPageActorRef['send'];

export type LogStreamPageStateMachineDependencies = {
  logViewStateNotifications: LogViewNotificationChannel;
} & LogStreamQueryStateMachineDependencies;

export const createLogStreamPageStateMachine = ({
  kibanaQuerySettings,
  logViewStateNotifications,
  queryStringService,
  toastsService,
  filterManagerService,
  urlStateStorage,
  timeFilterService,
}: LogStreamPageStateMachineDependencies) =>
  createPureLogStreamPageStateMachine().withConfig({
    services: {
      logViewNotifications: () => logViewStateNotifications.createService(),
      logStreamQuery: (context) => {
        if (!('resolvedLogView' in context)) {
          throw new Error('Failed to spawn log stream query service: no LogView in context');
        }

        const nowTimestamp = Date.now();
        const initialTimeRangeExpression: TimeRange = DEFAULT_TIMERANGE;
        const initialRefreshInterval: RefreshInterval = DEFAULT_REFRESH_INTERVAL;

        return createLogStreamQueryStateMachine(
          {
            dataViews: [context.resolvedLogView.dataViewReference],
            timeRange: {
              ...initialTimeRangeExpression,
              lastChangedCompletely: nowTimestamp,
            },
            timestamps: {
              startTimestamp: datemathToEpochMillis(initialTimeRangeExpression.from, 'down') ?? 0,
              endTimestamp: datemathToEpochMillis(initialTimeRangeExpression.to, 'up') ?? 0,
              lastChangedTimestamp: nowTimestamp,
            },
            refreshInterval: initialRefreshInterval,
          },
          {
            kibanaQuerySettings,
            queryStringService,
            toastsService,
            filterManagerService,
            urlStateStorage,
            timeFilterService,
          }
        );
      },
      logStreamPosition: (context) => {
        return createLogStreamPositionStateMachine(
          {
            targetPosition: null,
            latestPosition: null,
            visiblePositions: {
              endKey: null,
              middleKey: null,
              startKey: null,
              pagesBeforeStart: Infinity,
              pagesAfterEnd: Infinity,
            },
          },
          {
            urlStateStorage,
            toastsService,
          }
        );
      },
      waitForInitialQueryParameters: waitForInitialQueryParameters(),
      waitForInitialPositionParameters: waitForInitialPositionParameters(),
    },
  });
