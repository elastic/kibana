/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, createMachine } from 'xstate';
import {
  createLogStreamQueryStateMachine,
  LogStreamQueryStateMachineDependencies,
} from '../../../log_stream_query_state';
import type { LogViewNotificationChannel } from '../../../log_view_state';
import type {
  LogStreamPageContext,
  LogStreamPageContextWithLogView,
  LogStreamPageContextWithLogViewError,
  LogStreamPageEvent,
  LogStreamPageTypestate,
} from './types';

export const createPureLogStreamPageStateMachine = (initialContext: LogStreamPageContext = {}) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKAXATmAhgLYAK+M2+WYAdAK4B2Alk1o-sowF6QDEAMgHkAggBEAkgDkA4gH1BsgGpiAogHUZGACpCASpuUiA2gAYAuolAAHVLEatU9CyAAeiALQAmAJzUPHgGwArIEALAAcHmHhXsEhADQgAJ6IAQDM1IHGYQDs2ZnZxl5e-l6pAL5lCWiYuAQkZGAUVHRMLGwc3BD8wuLScgKKKuoAYkJifAYm5kgg1rb2jjOuCJ4hAIzUqZklHgX+xqlrkQnJCKlB1P4loYH+qV7hHoEVVejYeESk5FiUNAzMdnaXF4glEklk8hkSjUGgAqgBheHKAyTMxOOaAhxOZbZNbZajGXLBVIkrJrYInRBHYzUEIeVIhVJhNZZLws7IhF4garvOpfRo-Zr-NrsYFdUG9CEDKFDOGI5EiSZraZWGyYxagHEhEIEwkeI7Zc7GO6UhCZHzZML7MKBDwhQp0zmVblvWqfBpNGhofAQZhQPjoBSMMAAd26YL6kOhIzGEyMaJmGIW2JS4VpJTCWXp5K82Q8pvN1Et1tt9oedq5PLd9W+v2o3t99H9geDYYl4P6gxhGARSJR8ZVszVyaWiEZPnt-m8Ry8xjta38pqN1FK+uy+w8xhCgS8lddHxrArrDb9AagQdD4clnZl3d7CqVg6TjCxo4QISumy2MWNMWiAVNO58WMFkImMOc50CMI9xqA9+U9etUB9U8W1DYZ8EYZAQR6Dso1lLRdH0Ad0WHF8NRcdxvF8AJYgiKIwhiUIC1SDwMgNcC8g5O1nmdKs4I9QUaAAC3wWAzwvEMxHoX0AGM4BaAFWFFToeB0ZQkTEBQDBkIQ+D4GRiF0IQAFllH0HQMCmEj5jIlMEDWFj0mNfw1i8SJcVCVJTXtfEGJc7d6RCLjDQqZ16FQCA4CcPi+QE35rPVOzPAYzZtjcvYDgc003DWHVCSCXM-ECNYSuMKCYN5d1ayFVpAWUyAEpHTUx3zJIqTpahyXArIbTZIItwq6t4MExDkKbcTW0a2y312DJQiuK0bVyH94jas4wjCTZiiOfw8y2IrBv46qvSQxtm3PVt0MwhrE1I19mrNahmTtNy7l2tlesAnci1SDkQJZOkvGg3j91i47qBEsTUMk6TGDk+Bbps+6KPshydUeW5-BCWcXKxpdNy2ly1jCc4GOyGJDrBo9mkhibQyk2T5OFOqOhu1UkfI5YSoiWkIkx7HjQXVbTh8p7toChlgvKEHYKphDaehhm4fkxSgU6Kbka5nd8V29ZDRJNzbW8wkxf821JbpYHXllqrqZoQhGFgWxxsV2H4Y1zmqUOfxfEKPxGKyW5si+i1ft+3EI4OaWKiAA */
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
              on: {
                RECEIVED_ALL_PARAMETERS: {
                  target: 'initialized',
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
        storeLogViewError: assign((_context, event) =>
          event.type === 'LOADING_LOG_VIEW_FAILED'
            ? ({ logViewError: event.error } as LogStreamPageContextWithLogViewError)
            : {}
        ),
        storeResolvedLogView: assign((_context, event) =>
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
    },
  });
