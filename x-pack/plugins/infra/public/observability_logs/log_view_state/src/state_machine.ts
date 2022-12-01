/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of, throwError } from 'rxjs';
import { createMachine, actions, assign } from 'xstate';
import { ILogViewsClient } from '../../../services/log_views';
import { NotificationChannel } from '../../xstate_helpers';
import { LogViewNotificationEvent, logViewNotificationEventSelectors } from './notifications';
import {
  LogViewContext,
  LogViewContextWithError,
  LogViewContextWithId,
  LogViewContextWithLogView,
  LogViewContextWithResolvedLogView,
  LogViewContextWithStatus,
  LogViewEvent,
  LogViewTypestate,
} from './types';

export const createPureLogViewStateMachine = (initialContext: LogViewContextWithId) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UBqBLMB3AxADbrZ4CSEAwgBYCGAdjBANoAMAuoqAA6qxYAXLKnpcQAD0QBWVgCYAdAGYpixQA4A7ItmKAjGtkA2ADQgAnogC02jfKmyALKwCcrDU8XOHaqQF9fpmiYOAQArtwQtAJgbJxIILz8QiJikgi6rE7yDrpashpqmhrOig6mFgjWmfLFGlJOrHKGzrK6iv6BJCHyofRYfUK0hFgAXpD4sWKJgsKi8WmqivJquoaZUvUuXhrliBlS2RqG9bJum4XOHSBBpLjyxLQQ-VBEqI-PAMqhAMbfYJCQSbxabJOagNJHA6sXQOTwFFx1ZxqXYINRLBzOTGuVb2NqXALXLp4e5vJ6MV7vRgAMVoWEIgI4Uz4MxS82ksgUaPhrAMikMGjqKI5S0xjS0+mcGVhVxu3QATnBUIQAG7PfAK2BK0Kgr6-f4QBlxHjM0GpPY6WxqJFStq1GEotHZLHY46tdTtAmy4kapWq8k+wja2Y0umGplJWZm9Ji5Y6DbOdxyBM7cyIYXyUVuPRWqUezrBYnfahgb4Aa0+AiioVg+CLJfLjA+lYE1d1fwBLEZwJNkbZ6TqCgcUmcUgMMk8qwd6KxUkMaxyegchhlRLudbLFarNfXDagTa3IfpnaNCR7rPBexkumy0P52hKunyKYq6cz4pzmTzhILdwDyvGCoPBAXq4ECxoRueEjmhyyxOD4egnEuZSppUhg1Jk0IZMUCYOO4agrj+JKUlAh4AWAAhymYYGnhBYJQQgTiDg4RguLo9j5C0JgoY4aEaKshh6OonErARtzyAGQYiKREDquRlHUSCvYXggkoKIoBRse4s4clIz5pkuNT8YJVpGGorDLp6q7yDum4trA0myRRVFduBLJ0WkMK6Nepw4oYHIuKOUhCgZfFzsZwmsF+IE9BEURquEkRCI2Pztgax7hm5UaYgofHMUYuRqIYzEopYkryLac7sRsRwGKJ3QJXF5INUlJG0keClnu55oaKw8gCfUGICpFmRcRUlgcmo8iZGimJqE4DjeEVdXEs1zwOYBpIgR1tFRj1ByYl5+gqGOuglY+SxSLkSIjYY+gZBZBL0KgBrwPEIEZaafZeQ45Xqd4ihyIVRz2ihlg5LYchOC0mJ8QKy13L0-QzEMoyQB9Sn0asCi2v9gP8rdyEVPs8gcscKjOH5KjNH4lmEUBzzo5BaS4Qocj2N46yqBiigooYk0aEYKjDvxZkCfD4mKiqDPdjtfbXdk3jDmz3hGDzKErDUgvqHO86XeLNmNs21aM116T-TUQ6wiORiOBsDrXgLZMDcchVRVZf5ozLmV9qc+Qk60MKFEV+RovbmtOwtLsCbI4v09SbWe65n3KbhaG3edum5LILRBShfLYwLI58RTjTmTT+ZiRJoLSSbWV8ST5nqWxxzKKded+eVhdaAmxw5Jo+vFhuhsHgnEC119ivlZdzQtMKzSyCi+ed9n3eQn3Gji6tjDj8pFNp6c4OW7hdug44nKtHNUNFTC3ib7FLU117yeY5PbGrAU6nqNNJUcs4sb6AuI4C1mIb38L4IAA */
  createMachine<LogViewContext, LogViewEvent, LogViewTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'LogView',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: {
            target: 'loading',
          },
        },
        loading: {
          entry: 'notifyLoadingStarted',
          invoke: {
            src: 'loadLogView',
          },
          on: {
            loadingSucceeded: {
              target: 'resolving',
              actions: 'storeLogView',
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
              target: 'checkingStatus',
              actions: 'storeResolvedLogView',
            },
            resolutionFailed: {
              target: 'resolutionFailed',
              actions: 'storeError',
            },
          },
        },
        checkingStatus: {
          invoke: {
            src: 'loadLogViewStatus',
          },
          on: {
            checkingStatusSucceeded: {
              target: 'resolved',
              actions: 'storeStatus',
            },
            checkingStatusFailed: {
              target: 'checkingStatusFailed',
              actions: 'storeError',
            },
          },
        },
        resolved: {
          entry: 'notifyLoadingSucceeded',
          on: {
            reloadLogView: {
              target: 'loading',
            },
          },
        },
        loadingFailed: {
          entry: 'notifyLoadingFailed',
          on: {
            retry: {
              target: 'loading',
            },
          },
        },
        resolutionFailed: {
          entry: 'notifyLoadingFailed',
          on: {
            retry: {
              target: 'resolving',
            },
          },
        },
        checkingStatusFailed: {
          entry: 'notifyLoadingFailed',
          on: {
            retry: {
              target: 'checkingStatus',
            },
          },
        },
        updating: {
          entry: 'notifyLoadingStarted',
          invoke: {
            src: 'updateLogView',
          },
          on: {
            updatingSucceeded: {
              target: 'resolving',
              actions: 'storeLogView',
            },
            updatingFailed: {
              target: 'updatingFailed',
              actions: 'storeError',
            },
          },
        },
        updatingFailed: {
          entry: 'notifyLoadingFailed',
          on: {
            reloadLogView: {
              target: 'loading',
            },
          },
        },
      },
      on: {
        logViewIdChanged: {
          target: '.loading',
          actions: 'storeLogViewId',
        },
        update: {
          target: '.updating',
        },
      },
    },
    {
      actions: {
        notifyLoadingStarted: actions.pure(() => undefined),
        notifyLoadingSucceeded: actions.pure(() => undefined),
        notifyLoadingFailed: actions.pure(() => undefined),
        storeLogViewId: assign((context, event) =>
          'logViewId' in event
            ? ({
                logViewId: event.logViewId,
              } as LogViewContextWithId)
            : {}
        ),
        storeLogView: assign((context, event) =>
          'logView' in event
            ? ({
                logView: event.logView,
              } as LogViewContextWithLogView)
            : {}
        ),
        storeResolvedLogView: assign((context, event) =>
          'resolvedLogView' in event
            ? ({
                resolvedLogView: event.resolvedLogView,
              } as LogViewContextWithResolvedLogView)
            : {}
        ),
        storeStatus: assign((context, event) =>
          'status' in event
            ? ({
                status: event.status,
              } as LogViewContextWithStatus)
            : {}
        ),
        storeError: assign((context, event) =>
          'error' in event
            ? ({
                error: event.error,
              } as LogViewContextWithError)
            : {}
        ),
      },
    }
  );

export interface LogViewStateMachineDependencies {
  initialContext: LogViewContextWithId;
  logViews: ILogViewsClient;
  notificationChannel?: NotificationChannel<LogViewContext, LogViewEvent, LogViewNotificationEvent>;
}

export const createLogViewStateMachine = ({
  initialContext,
  logViews,
  notificationChannel,
}: LogViewStateMachineDependencies) =>
  createPureLogViewStateMachine(initialContext).withConfig({
    actions:
      notificationChannel != null
        ? {
            notifyLoadingStarted: notificationChannel.notify(
              logViewNotificationEventSelectors.loadingLogViewStarted
            ),
            notifyLoadingSucceeded: notificationChannel.notify(
              logViewNotificationEventSelectors.loadingLogViewSucceeded
            ),
            notifyLoadingFailed: notificationChannel.notify(
              logViewNotificationEventSelectors.loadingLogViewFailed
            ),
          }
        : {},
    services: {
      loadLogView: (context) =>
        from(
          'logViewId' in context
            ? logViews.getLogView(context.logViewId)
            : throwError(() => new Error('Failed to load log view: No id found in context.'))
        ).pipe(
          map(
            (logView): LogViewEvent => ({
              type: 'loadingSucceeded',
              logView,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'loadingFailed',
              error,
            })
          )
        ),
      updateLogView: (context, event) =>
        from(
          'logViewId' in context && event.type === 'update'
            ? logViews.putLogView(context.logViewId, event.attributes)
            : throwError(
                () =>
                  new Error(
                    'Failed to update log view: Not invoked by update event with matching id.'
                  )
              )
        ).pipe(
          map(
            (logView): LogViewEvent => ({
              type: 'updatingSucceeded',
              logView,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'updatingFailed',
              error,
            })
          )
        ),
      resolveLogView: (context) =>
        from(
          'logView' in context
            ? logViews.resolveLogView(context.logView.id, context.logView.attributes)
            : throwError(
                () => new Error('Failed to resolve log view: No log view found in context.')
              )
        ).pipe(
          map(
            (resolvedLogView): LogViewEvent => ({
              type: 'resolutionSucceeded',
              resolvedLogView,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'resolutionFailed',
              error,
            })
          )
        ),
      loadLogViewStatus: (context) =>
        from(
          'resolvedLogView' in context
            ? logViews.getResolvedLogViewStatus(context.resolvedLogView)
            : throwError(
                () => new Error('Failed to resolve log view: No log view found in context.')
              )
        ).pipe(
          map(
            (status): LogViewEvent => ({
              type: 'checkingStatusSucceeded',
              status,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'checkingStatusFailed',
              error,
            })
          )
        ),
    },
  });
