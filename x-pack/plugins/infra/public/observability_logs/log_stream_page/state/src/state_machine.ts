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
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKAXATmAhgLYAK+M2+WYAdAK4B2Alk1o-sowF6QDEAMgHkAggBEAkgDkA4gH1BsgGpiAogHUZGACpCASpuUiA2gAYAuolAAHVLEatU9CyAAeiALQAmAJzUPHgGwArIEALAAcHmHhXsEhADQgAJ6IAQDM1IHGYQDs2ZnZxl5e-l6pAL5lCWiYuAQkZGAUVHRMLGwc3BD8wuLScgKKKuoAYkJifAYm5kgg1rb2jjOuCJ4hAIzUqZklHgX+xqlrkQnJCKlB1P4loYH+qV7hHoEVVejYeESk5FiUNAzMdnaXF4glEklk8hkSjUGgAqgBheHKAyTMxOOaAhxOZbZNbZajGXLBVIkrJrYInRBHYzUEIeVIhVJhNZZLws7IhF4garvOpfRo-Zr-NrsYFdUG9CEDKFDOGI5EiSZraZWGyYxagHEhEIEwkeI7Zc7GO6UhCZHzZML7MKBDwhQp0zmVblvWqfBpNGhofAQZhQPjoBSMMAAd26YL6kOhIzGEyMaJmGIW2JS4VpJTCWXp5K82Q8pvN1Et1tt9oedq5PLd9W+v2o3t99H9geDYYl4P6gxhGARSJR8ZVszVyaWiEZPnt-m8Ry8xjta38pqN1FK+uy+w8xhCgS8lddHxrArrDb9AagQdD4clnZl3d7CqVg6TjCxo4QISumy2MWNMWiAVNO58WMFkImMOc50CMI9xqA9+U9etUB9U8W1DYZ8EYZAQR6Dso1lLRdH0Ad0WHF8NRcdxvF8AJYgiKIwhiUIC1SDwMgNcC8g5O1nmdKs4I9QUaAAC3wWAzwvEMxHoX0AGM4GoAFWFFTg-QARVoMAcESHgdGUJExAUAwZEkMRNDEIQ+BkVTYWUHQAE0ZGIXQhAAWWUfQdAwKYSPmMinFOKcNgKXYwnOPMbRYhJlhCYoYN5d1a2aESxNQyTpMYOTYAUkUOjUjStJ4BQLLEEQrJs+yZHhAAJIRpFRJ9SNfTUx2KAtDSLOdLTCyJAhYuLq3gwTqGS8TWyk2T5MUoEVKbdTNO0yQir4EqytshzqtqqR6p89UU3fVqkkQS1WNKXEoP8cLeo8fr+MS4TRNG0Nxoyyacq4PL5p4My3Mqmq6uIxNGvI6KDtOW1Ag6kLuoi67eP3PkBLrEbUuezLssBZS-WIIHYB0vTlAMoyTLMizHIEDBTLEAQJEc5y3I8ryE1VXymoo-bF0OhAGI2EDbVCi6er6uHYIRu7hoelH0rRqbMabbGWfoXHiHJynqYwX7Nu2wGFb2mKOdOIofEKBksgFmGbtFo8kol88xql16MY6XglpW6y1o1-7vO13a3wXPJaTWCJbSne0SQLOcV3XJ5t0yXq1jWC2Eqt+6Uttp77aymWna6b7lA9raAeZn3moQBdCV8b99hiQ0rnzTntx1XMpxuWPDgT4X4sPBDkbTtKJszt7Oh4ZWKbMtX861ouRxLsv8XpHcq8CGup0A+OCVCVJskY4w49h14RaT7ubYk1GHaU7OeAAKVhFziBkTQBHv3Qts0MnR6piQvanvzff2OfK8KEvc4K967Gkjs3GOO826Jy7kNHuJ8M7o3PmKPGys9AygpgAIQmG-VWEhGYNR1r-cu89iiAOXnXU4WwwjgOjsEKB8cYGDSRsfO2-ckHTV4LCYgIghD6HvmIH6OhNZfyHEQmef8K4L3IcAyhR01g+DWCxTIkDd5MMRtbVOCD2FZxQdw3h-DdLDF0hgKqxkJAeSWqI58rNlizykWQ6usilwsloS3Bh7d96d2YZox6fcXoD0digpyW0ZDKAkKVTBsJhjDFsjIXSQhqqTzEcXNm9jSGLwoaaAIJ0o7uLju3Z09BUAQDgE4PiltPQ7WnmzTwDFNjbC8LsY0BwlGmjcCxAk9IOSZgXDuUotx1Fi2FEEzo1Sf4lzpKaNYdJqDknAlkG0bIghbiGcnRCyEmx+PGbYlI+JYhXCtDaXIP54icyZDQ+4-gjgCy2H4HiXiBoaK9EhRszZe7oUwpAHZwNEAQ2ZHaJpdwLpsiWYBHcRZN72njlubw0EO5PLFvAthASfl7TcOEaZEcQhR3WDaGKXVPEugPrAlhWiUXS0Hh9LSaK3zGEAvqSGXUzZXTWUfcl6cdFUrljjWlJd6WcwiKxTcUMWVC0ebddZyLOUBI4cpb53sal2KZDqPI5IllANrgWJ4TL+aXXFcS7xzzqCEEYLAWwWzJb9z5Wkw4-hfCFD8NvG0F1wUWk3pvXEXqDjlAqGUIAA */
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
