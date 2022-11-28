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
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UBqBLMB3AxADbrZ4CSEAwgBYCGAdjBANoAMAuoqAA6qxYAXLKnpcQAD0QAWAEwAaEAE9EADgDMAOikBOXdplq12lQFYZrKQF9LCtJhwEArtwi0BYNpyQhe-ISLFJBFkFZQR9bQ1WXVYARikANh1WBNY1a1sSBw1Heiw8oVpCLAAvSHxPMV9BYVFvINMTDRM1WNj1ExUAdgSVGVjQxBkZBI1tHpMTYylYk1jddJsQO1JcDWJaCHyoIlRN7YBlRwBjY7BISErvav860CDYmW1Nada2hK6phITBhBkulRjCYmFIJbSPFTdDLLLJ4dZ7LaMXb7RgAMVoWEIlw4VT4NQC9VUHw0I0mKikXRGsVYMikv3+gPGCUmoPBMkhXWhK2yACc4KhCAA3bb4PmwAWOW5HU7nCDYrw8PG3QKIR7PMbkt6xD5fH5KRBdQwaNR9dQM74LLmwtZigXCpG2wiS2rozHy3F+WoqhCxQwyEk6cHRE1SFLyfU+2JdDTai3a1gpeYJRaZexw47UMDHADWhwEbkcsHwGazucYB3zAkL0rOFxYOOuSq9hIQrWjrRkZhpn3+aiSvykUk0UhaEKm2raKZhabWJZzeYLRbnZagFcXrqx9YVPibBPuiDbxseXf+ZkN-YjnUi2jDzPZINaViW3LhjsF5T5GwgL9wV0Vnr3CRVEmZo3g6bpen6AdvhjLptDBMwpD6PttBMK0Z3hFEoA3D8wAEHlFD-HcALuICEEaUC2nAno+gGCM1C6KQxieXoTA+WkkiSdDVg0R1nREHCIFFPCCKIm5m33H0nheTU2m1T54L1MJ+k0NpjBGVIjEmJ9Ux45cFyrWBBOE-DCIbf98VIoIKWjUcRhUBJqXiVgVF+FpIlDBIRjUKYdApWJuOyZxXCEJFgrcQ4TlrOUtw9SzvTVGShzknVFN+PpIkML4ujghMfJkQK4XC0KdmK7ZBLE3crNVaSNWS94FO+X59Cadkg3+Z4GIC6F6FQOV4G8H84uVFsAFolMQUamj0YxtBmLt6sKtZcnyGoilKSBhoksiuhcjRdrUFJwRUOJzFciNhmjYZmWZHLehNTln2tTDESgLbAIeNJ20eBifKjOImoupJ9rSWYGI+YwToSJbeP5IVtne6qfTMWJmlmMwHM6ey1HpHKQcO-QvJMAE+xh-Ty0rQtEe9EII120YfLmk1HJHEdut03k4ffCBqZbYmmmJlR4kMcEvMhAdZFg+DdpMJCNJhr9yoxTdeckzSojA54QUSdpfkMJiIa6doRymSE1B06ceL425BNVsi5MBI3TGmPpk1p5SLBJUHGKFpzmQtn8NHJ1dKaM5XNsbEjvX55oAWFoxtXZc6wlSUZ+lSJDZijcx2ctoKXAixg7c+hijwMQ05l22N0v0KIYjmaJEsejmioLkrbcj+KW1mfo0cmdlmVd9RmopPvehc7VJkMaxrCAA */
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
          on: {
            retry: {
              target: 'resolving',
            },
          },
        },
        checkingStatusFailed: {
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
        updatingFailed: {},
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
                ...context,
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
