/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, ActorRefFrom, createMachine } from 'xstate';
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
  LogStreamPageEvent,
  LogStreamPageTypestate,
} from './types';

export const createPureLogStreamPageStateMachine = (initialContext: LogStreamPageContext = {}) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKAXATmAhgLYAK+M2+WYAdAK4B2Alk1o-sowF6QDEAMgHkAggBEAkgDkA4gH1BsgGpiAogHUZGACpCASpuUiA2gAYAuolAAHVLEatU9CyAAeiALQAmAJzUPHgGwArIEALAAcHmHhXsEhADQgAJ6IAQDM1IHGYQDs2ZnZxl5e-l6pAL5lCWiYuAQkZGAUVHRMLGwc3BD8wuLScgKKKuoAYkJifAYm5kgg1rb2jjOuCJ4hAIzUqZklHgX+xqlrkQnJCKlB1P4loYH+qV7hHoEVVejYeESk5FiUNAzMdnaXF4glEklk8hkSjUGgAqgBheHKAyTMxOOaAhxOZbZNbZajGXLBVIkrJrYInRBHYzUEIeVIhVJhNZZLws7IhF4garvOpfRo-Zr-NrsYFdUG9CEDKFDOGI5EiSZraZWGyYxagHEhEIEwkeI7Zc7GO6UhCZHzZML7MKBDwhQp0zmVblvWqfBpNGhofAQZhQPjoBSMMAAd26YL6kOhIzGEyMaJmGIW2JS4VpJTCWXp5K82Q8pvN1Et1tt9oedq5PLd9W+v2o3t99H9geDYYl4P6gxhGARSJR8ZVszVyaWiEZPnt-m8Ry8xjta38pqN1FK+uy+w8xhCgS8lddHxrArrDb9AagQdD4clnZl3d7CqVg6TjCxo4QISumy2MWNMWiAVNO58WMFkImMOc50CMI9xqA9+U9etUB9U8W1DYZ8EYZAQR6Dso1lLRdH0Ad0WHF8NRcdxvF8AJYgiKIwhiUIC1SDwMgNcC8g5O1nmdKs4I9QUaAAC3wWAzwvEMxHoX0AGM4BaAFWFFToeB0ZQkTEBQDBkSQxE0MQhD4GRiF0IQAFllH0HQMCmEj5jIlMEBnfxqAiYojjWVJCjnJcwnSIIrSuNZZ2CGJyi5ehUAgOAnD4vkBN+Oz1UczwGM2bYvF2Y0Dk8003AXFcwitG0imCjlsl3Xj93i2shVaQFlMgJKR01Md8ySKk6WoclwKyEqF0yJ1Xlgmqj2aE8m3E1tmoct9dgyUIrmKwJch-eIOrOIrNncgI8y2PweOG3l3Vqr0kMbZtz1bdDMKaxNSNfVqzVco4Qkyu5-AqtYSsAnci1SDkQJZOkvGgqqRpOsbhNEqbQyk2SYvu+zHoopzNxpQIWPXY0p1BikNrWPE2M8o5AsZQkYOOw8EJEsTUMk6TGDk2AFJFDo7tVZHyOWV6wgyLH9iubwbUCU0nlYoHDjxO0-KnSnq3gwTqFp2GGYRlnFKBToZpRnmmR1PIF3Avy3NSU1tWA85CYKY1vqueX+NO6hCEYWBbEm+n4aZxHOeSt8SZczdMu8YIslubJfotAGAdxWODnCiogA */
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
                },

                VALID_QUERY_CHANGED: {
                  target: 'uninitialized',
                  internal: true,
                  actions: 'forwardToInitialParameters',
                },
              },
            },
            initialized: {},
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
      },
      guards: {
        hasLogViewIndices: (_context, event) =>
          event.type === 'LOADING_LOG_VIEW_SUCCEEDED' &&
          ['empty', 'available'].includes(event.status.index),
      },
    }
  );

export type LogStreamPageStateMachineDependencies = {
  logViewStateNotifications: LogViewNotificationChannel;
} & LogStreamQueryStateMachineDependencies;

export const createLogStreamPageStateMachine = ({
  kibanaQuerySettings,
  logViewStateNotifications,
  queryStringService,
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
            urlStateStorage,
          }
        );
      },
      waitForInitialParameters: waitForInitialParameters(),
    },
  });

export type LogStreamPageStateMachine = ReturnType<typeof createLogStreamPageStateMachine>;
export type LogStreamPageActorRef = OmitDeprecatedState<ActorRefFrom<LogStreamPageStateMachine>>;
