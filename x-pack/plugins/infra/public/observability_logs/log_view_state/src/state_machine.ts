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
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UBqBLMB3AxMgPIDiA+hgJICiA6mZQCJkDCAEgIIByJ1jA2gAYAuolAAHVLCwAXLKgB2YkAA9EAFgAcARgB0ANgBM+nQFZ96gOwBmAJyXBpgDQgAnogC01q7q2DB3qa2moaCOgC+4S5omDgEAKoACowcACrUQqJIIJLScorKagjaAfq6ofrWmkH6ttrq6tYu7ghehuq6lqbemlX65g6mkdHo2Hi6AK4KWNNyAIYANlgAXpD4mcq5svJK2UXetrra+vpd1traQdZVzYglZZbGQYKWttahmo7DIDFjuLoLVBzCAzKCEIgcRiUHhkADK8RYLGofD4G2yW3yu1ARRsHXOhmCT2COk0twQIV0pn8gi0dkqVMM2m+vziAKBIIUYOIkOh5AAYhxKMhUSJNlJtgU9ogqZpOqFnqZzIZroYyYZlbpbLZ-LZ+oz2sd1MzRqyAE5wVALABuoPwACVqLCiMh4qlKEQuHCEUiUQJRejxZjCnd1ZZdL0LoI6mdrmSKVT-LTddYqdpNMbYuNzbBLTbOfbHc7Xe7PQKhSKshJAztgwhiZSLhdHpp1IZLNpLGqNVqdXrtAbLBm-roAMYACzAI4A1qDYTI5jIJrB8OxqCwANK8uGpNLxWFexHIxgVsV5GtS4qWTRhywnUJa4xt0ydtyIV6+Anakw6axGayDqIfhNcZx0nGdOTnBclxXNg103GFYR3VI9zIMthT9SscmrSVsTuUxtGscMBjTc57GvLtCJ7KM+wHIczQta01gdblmGIcgqDoNEqzPHDVBDUwOhCa4dWVUJbzJLwDGuTRanMdRglqKojUAllxkBYFQT5OYsAWJjqFSO0AE0uKwnisT4hA7A6W9HkVX8-HsNV1AeY4ThsQRDB0XVDDorMGImTEtJ0vSDOM-1uIlcyim1PRKmMIxLn-Ex1CclyTlOawPK8-RfP+UDp1nedF1gILdIgAtQpMjFz1w4p1A7XRvG0N5bEMKk3kaVLOlcjKsuaoxcsmcQIAXW0khSN0EO9I8TwDMza3sMNtVsbotH6d5bBS19Wk0Q59A8oIGhMMICSZFTgP+CZhtG-NxrSLc0NmiKgwvfsfEseTanVeTjH-CT1UOGkW2MB8AgZQarpGuROVKvSWLINiKBoWgquwqLEFOWUU2CBptWufbSW2jx+1MXRHEy-D1V-D77EiQCFFQCA4GUVTcFPSLawI2Vahky56mqK9+gkxoOmCRMBL1cwUwh6ZZiwRYVkgdmXtqtMyh5-Q+a0Z8ZOcbaSlJ9UTkaZqenMWxBvUjkoGVmqLKsQwybatqVt2kIXxaEw5X6a86heN4XkG7Nc1BW3eOiz5fG17U2q0X64z0R51pkk4aXwwb8vAqBIOKsP0eKfDAdMCpajWxxVW2q8DDkgi3kuYIhnOzN-mDxiIDz2tGQuavE3LixGiaSvual+w+ccR4Lab4crc07Syo7i8rHVi5lWfDsCTaslf0d9eVvbXVqX6IP-MCuelbmjmL1H8pBEqdtzG6fCt6MI4J5sex+nq68M4nAqIKKpcsN24XxVhZS4oRfCmF6PFBoE8t5BCOFld4zlLgCRpBDa60MbYgLttFE4BhQj1Q+gJKwip-qtnDIyFs6hqL1QaOmKerJIY3SgEAheqttZHHwpjf8VQgb-QJJQtM9UkoNFbABSIQA */
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
            LOADING_SUCCEEDED: {
              target: 'resolving',
              actions: 'storeLogView',
            },
            LOADING_FAILED: {
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
            RESOLUTION_FAILED: {
              target: 'resolutionFailed',
              actions: 'storeError',
            },
            RESOLUTION_SUCCEEDED: {
              target: 'checkingStatus',
              actions: 'storeResolvedLogView',
            },
          },
        },
        checkingStatus: {
          invoke: {
            src: 'loadLogViewStatus',
          },
          on: {
            CHECKING_STATUS_FAILED: {
              target: 'checkingStatusFailed',
              actions: 'storeError',
            },
            CHECKING_STATUS_SUCCEEDED: {
              target: 'resolved',
              actions: 'storeStatus',
            },
          },
        },
        resolved: {
          entry: 'notifyLoadingSucceeded',
          on: {
            RELOAD_LOG_VIEW: {
              target: 'loading',
            },
          },
        },
        loadingFailed: {
          entry: 'notifyLoadingFailed',
          on: {
            RETRY: {
              target: 'loading',
            },
          },
        },
        resolutionFailed: {
          entry: 'notifyLoadingFailed',
          on: {
            RETRY: {
              target: 'resolving',
            },
          },
        },
        checkingStatusFailed: {
          entry: 'notifyLoadingFailed',
          on: {
            RETRY: {
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
            UPDATING_FAILED: {
              target: 'updatingFailed',
              actions: 'storeError',
            },
            UPDATING_SUCCEEDED: {
              target: 'resolving',
              actions: 'storeLogView',
            },
          },
        },
        updatingFailed: {
          entry: 'notifyLoadingFailed',
          on: {
            RELOAD_LOG_VIEW: {
              target: 'loading',
            },
          },
        },
      },
      on: {
        LOG_VIEW_ID_CHANGED: {
          target: '.loading',
          actions: 'storeLogViewId',
        },
        UPDATE: {
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
              type: 'LOADING_SUCCEEDED',
              logView,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'LOADING_FAILED',
              error,
            })
          )
        ),
      updateLogView: (context, event) =>
        from(
          'logViewId' in context && event.type === 'UPDATE'
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
              type: 'UPDATING_SUCCEEDED',
              logView,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'UPDATING_FAILED',
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
              type: 'RESOLUTION_SUCCEEDED',
              resolvedLogView,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'RESOLUTION_FAILED',
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
              type: 'CHECKING_STATUS_SUCCEEDED',
              status,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'CHECKING_STATUS_FAILED',
              error,
            })
          )
        ),
    },
  });
