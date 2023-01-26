/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, ActorRefFrom, createMachine, EmittedFrom } from 'xstate';
import {
  createLogStreamQueryStateMachine,
  LogStreamQueryStateMachineDependencies,
} from '../../../log_stream_query_state';
import type { LogViewNotificationChannel } from '../../../log_view_state';
import { OmitDeprecatedState } from '../../../xstate_helpers';
import { waitForInitialParameters } from './initial_parameters_service';
import type {
  LogStreamPageContext,
  LogStreamPageContextWithLogView,
  LogStreamPageContextWithLogViewError,
  LogStreamPageContextWithQuery,
  LogStreamPageEvent,
  LogStreamPageTypestate,
} from './types';

export const createPureLogStreamPageStateMachine = (initialContext: LogStreamPageContext = {}) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKAXATmAhgLYAK+M2+WYAdAK4B2Alk1o-sowF6QDEAMgHkAggBEAkgDkA4gH1BsgGpiAogHUZGACpCASpuUiA2gAYAuolAAHVLEatU9CyAAeiALQAmAJzUPHgGwArIEALAAcHmHhXsEhADQgAJ6IAQDM1IHGYQDs2ZnZxl5e-l6pAL5lCWiYuAQkZGAUVHRMLGwc3BD8wuLScgKKKuoAYkJifAYm5kgg1rb2jjOuCJ4hAIzUqZklHgX+xqlrkQnJCKlB1P4loYH+qV7hHoEVVejYeESk5FiUNAzMdnaXF4glEklk8hkSjUGgAqgBheHKAyTMxOOaAhxOZbZNbZajGXLBVIkrJrYInRBHYzUEIeVIhVJhNZZLws7IhF4garvOpfRo-Zr-NrsYFdUG9CEDKFDOGI5EiSZraZWGyYxagHEhEIEwkeI7Zc7GO6UhCZHzZML7MKBDwhQp0zmVblvWqfBpNGhofAQZhQPjoBSMMAAd26YL6kOhIzGEyMaJmGIW2JS4VpJTCWXp5K82Q8pvN1Et1tt9oedq5PLd9W+v2o3t99H9geDYYl4P6gxhGARSJR8ZVszVyaWiEZPnt-m8Ry8xjta38pqN1FK+uy+w8xhCgS8lddHxrArrDb9AagQdD4clnZl3d7CqVg6TjCxo4QISumy2MWNMWiAVNO58WMFkImMOc50CMI9xqA9+U9etUB9U8W1DYZ8EYZAQR6Dso1lLRdH0Ad0WHF8NRcdxvF8AJYgiKIwhiUIC1SDwMgNcC8g5O1nmdKs4I9QUaAAC3wWAzwvEMxHoX0AGM4BaAFWFFToeB0ZQkTEBQDBkSQxE0MQhD4GRiF0IQAFllH0HQMCmEj5jIlMEBnfxqAiYojjWVJCjnJcwnSIIrSuNZZ2CGJyl4-c+QEusRLE1DJOkxg5NgBSRQ6XgFEMsQRBkABFWFlB0ABNGR4QACSEaRUSfUjX01Kl-DyWk1giW0p3tElTTxfFwhCPYQIXXE1idV5YKi2tmli8TWyk2T5OFQFlN4SRMr4bK8oK4rSoqqriMTWryOWBdGtckCQMCEknn8MIl21FcWLxVJDUzfwWv8GDeXdCbhNE6bQ1mpL5MUoEVNW9b8sKkrysqqRqrs9VHMGwJmtagI7QOVICznFd1yebdMgutY1gqZ16FQCA4CcPjxqPKh4ZHeqVkiHwtl-XZjQOTzTTcNk2NtQ4-A5q0PureDBNSxb0ogemHLfOkurpahyXArIbTZIItxF-jvsQ5Cmz+kMZbqiiEF2DJQiuK0bVyH94iSRAmTCTZ3ICPMtj8HjRs+w8EJPfX4vQzDICNw7EGR5k7S8NJGrZNXAJ3IsnvtImt28aCIrGr7aZ+uLzxmxLkpDxHNxpC7dn2K404pe331YrwokNQ1GIF7ItZphCpvigHkolpSpaLt8jjTMv12NKd6+r04nlYgbDjxO0-KnNus4736u4LoG0rFAfGc8qIi0Cck1cCQ1K4LJ4iznS1zjzG0WOXn3xcIRhYFsf28-+jf4H2+zjaOw4XKbijt4YIWRbjZHjhaJ6T1cSwIxiTMoQA */
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
          initial: 'uninitialized',

          states: {
            uninitialized: {
              invoke: {
                src: 'waitForInitialParameters',
                id: 'waitForInitialParameters',
              },

              on: {
                RECEIVED_INITIAL_PARAMETERS: {
                  target: 'initialized',
                  actions: 'storeQuery',
                },

                VALID_QUERY_CHANGED: {
                  target: 'uninitialized',
                  internal: true,
                  actions: 'forwardToInitialParameters',
                },

                INVALID_QUERY_CHANGED: {
                  target: 'uninitialized',
                  internal: true,
                  actions: 'forwardToInitialParameters',
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
              },
            },
          },

          invoke: {
            src: 'logStreamQuery',
            id: 'logStreamQuery',
          },
        },
        missingLogViewIndices: {},
      },
    },
    {
      actions: {
        forwardToInitialParameters: actions.forwardTo('waitForInitialParameters'),
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
          event.type === 'RECEIVED_INITIAL_PARAMETERS'
            ? ({
                parsedQuery: event.validatedQuery,
              } as LogStreamPageContextWithQuery)
            : event.type === 'VALID_QUERY_CHANGED'
            ? ({
                parsedQuery: event.parsedQuery,
              } as LogStreamPageContextWithQuery)
            : {}
        ),
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
}: LogStreamPageStateMachineDependencies) =>
  createPureLogStreamPageStateMachine().withConfig({
    services: {
      logViewNotifications: () => logViewStateNotifications.createService(),
      logStreamQuery: (context) => {
        if (!('resolvedLogView' in context)) {
          throw new Error('Failed to spawn log stream query service: no LogView in context');
        }

        return createLogStreamQueryStateMachine(
          {
            dataViews: [context.resolvedLogView.dataViewReference],
          },
          {
            kibanaQuerySettings,
            queryStringService,
            toastsService,
            filterManagerService,
            urlStateStorage,
          }
        );
      },
      waitForInitialParameters: waitForInitialParameters(),
    },
  });
