/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, createMachine } from 'xstate';
import type { LogViewNotificationChannel } from '../../../log_view_state';
import type {
  LogStreamPageContext,
  LogStreamPageContextWithLogView,
  LogStreamPageContextWithLogViewError,
  LogStreamPageEvent,
  LogStreamPageTypestate,
} from './types';

export const createLogStreamPageStateMachine = ({
  logViewStateNotifications,
}: {
  logViewStateNotifications: LogViewNotificationChannel;
}) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKAXATmAhgLYAK+M2+WYAdAK4B2Alk1o-sowF6QDEa+EZlAAy6AGqMwAdwo4qEANoAGALqJQAB1SxGrVPXUgAHogC0ARmoA2ACwAOGzYCsATgDMNt3adWA7L4AaEABPRAAmP2obMPslOzCw3zdfcysAXzSgtExcAhIyMAoqOiYWNg5uCD5UASFRKAlpADF8RmRIZTUkEC0dPQNukwRTMPMw6zc3c1SE1yclGyDQhDcrK2srFycnG18I1aVUjKz0bDwiUnIsShoGZl1yrl5+QXoRcUkZWgBjb7BIDqqQy9B76QxDFK+ahKfzbSZuOLmbZLRBjJRRMIeLzmOIuHG+GzHEDZM55S6Fa7FO5ldhPKovOofaQYH5-AGKcxdTTaUEDUAQxzQmExGzuRYhRBOSbUVwwqwLcx4ra+Ikk3IXApFGgMt71RpSaq1XVMqQtNqArk9Hn9cHhNzjOxKHy+HxKeUubxuFEIeYuai+Ozy7wxJQuaKEzLE07q-JXG7UHXvBqfQ2vJP6lm-f4QC3A62MMGDRCeP02N1hPEVpQxVLeg7UdyjXzysILVyq6PnWMU+OJvUpvsmzNsnMcy0gm1FhA2NbUSauWypMvbZEShBWLzQ-Fh5xOJFIjs5LvkrUJmpp-vNVrtennxnJ5nXOS57oTgt84xmSy2BxOXwuJQ3TsBEHDCb0pXGPcIisOwCSsJwIjCQ9SQ1ONigAC3wWBLykABJehBD+WASnuVhaUqHg8D+RgADdIAAQWQZBSBwIgwCoHBYE6PM+nfW0EHMe0bDnHFHUVf8XF8atvWcP0K3sFxFLEtwwwySN6FQHN4G6NVj01SkwB43l+JGeUJimGYwjmBZvQsdY5R8NYnWSbYkMjXSyX0+NqQecjICMyd+WLMC13MaJqCRQC4m8PF4IWZCYxPAyzyNdNPgCvip0SGUdjWQNvH8LYbLXLw7DnFwrDGPxMQQqyEr0tDtTvY0H1Na9-NffNCyCn1qDsMZRX2Pw8Ri714L9JICUOHFog9erPMa6hMOwk18MIuAMu6z8BME4T7H2cwXRiRC602ah5Ng+ZYKdBx5tQnsMKwnC1sYIiSJpCoOu5XitqGaZ4iieIN0OhDoisELlmcMr-3sV1gydFV3M7BaHpoZbnoI164GoUjHkqTaPz+1zzvsUrFS2MJAxkpxobDbwgwQhG7u7U9CEYWAdBa-UXqIgn+ME1JztDBItiu50xtcf1kmSSFDqUSY1LSIA */
  createMachine<LogStreamPageContext, LogStreamPageEvent, LogStreamPageTypestate>(
    {
      context: {},
      predictableActionArguments: true,
      invoke: {
        src: 'logViewNotifications',
      },
      id: 'logStreamPageState',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          on: {
            loadingLogViewStarted: {
              target: 'loadingLogView',
            },
            loadingLogViewFailed: {
              target: 'loadingLogViewFailed',
              actions: 'storeLogViewError',
            },
            loadingLogViewSucceeded: [
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
            loadingLogViewFailed: {
              target: 'loadingLogViewFailed',
              actions: 'storeLogViewError',
            },
            loadingLogViewSucceeded: [
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
            loadingLogViewStarted: {
              target: 'loadingLogView',
            },
          },
        },
        hasLogViewIndices: {
          initial: 'uninitialized',
          states: {
            uninitialized: {
              on: {
                receivedAllParameters: {
                  target: 'initialized',
                },
              },
            },
            initialized: {},
          },
        },
        missingLogViewIndices: {},
      },
    },
    {
      actions: {
        storeLogViewError: assign((_context, event) =>
          event.type === 'loadingLogViewFailed'
            ? ({ logViewError: event.error } as LogStreamPageContextWithLogViewError)
            : {}
        ),
        storeResolvedLogView: assign((_context, event) =>
          event.type === 'loadingLogViewSucceeded'
            ? ({
                logViewStatus: event.status,
                resolvedLogView: event.resolvedLogView,
              } as LogStreamPageContextWithLogView)
            : {}
        ),
      },
      services: {
        logViewNotifications: () => logViewStateNotifications.createService(),
      },
      guards: {
        hasLogViewIndices: (_context, event) =>
          event.type === 'loadingLogViewSucceeded' &&
          ['empty', 'available'].includes(event.status.index),
      },
    }
  );
