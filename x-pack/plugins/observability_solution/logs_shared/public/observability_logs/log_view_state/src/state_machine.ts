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
  LogViewContextWithLogView,
  LogViewContextWithReference,
  LogViewContextWithResolvedLogView,
  LogViewContextWithStatus,
  LogViewEvent,
  LogViewTypestate,
} from './types';
import {
  InitializeFromUrl,
  UpdateContextInUrl,
  ListenForUrlChanges,
} from './url_state_storage_service';

export const createPureLogViewStateMachine = (initialContext: LogViewContextWithReference) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UBqBLMB3AxMgPIDiA+hgJICiA6mZQCJkDCAEgIIByJ1jA2gAYAuolAAHVLCwAXLKgB2YkAA9EAFkEBmAHQAmAGwB2dQYAcAVkGmAjGYMAaEAE9EAWi3qjO9WcGCLIzMbLWMLAE4AX0inNEwcAgBVAAVGDgAVaiFRJBBJaTlFZTUEG20DfUEDLUtwg3CbdXUtJ1cEDz11HSMLTzMagwtjAOjY9Gw8HQBXBSxZuQBDABssAC9IfGzlfNl5JVySz3CdGwMwrRsbCK0a1sQyiqNDCMEjcK09QT8LUZA4idwOiWqAWEDmUEIRA4jEoPDIAGVEiwWNQ+HwtrkdoV9qASkZPDoLnpwmZniTgmY7ghSTorP5fFo6lorHobL9-gkgSCwQoIcRobDyAAxDiUZDokTbKS7IoHRBWMzdT4vCxDPQ3PRUvTqnThcL+OoWVmdU7qdnjTkAJzgqCWADdwfgAErUeFEZCJdKUIhcMgisUSnISaXY4qIcm0y6XJ5mdR6Iw2IxanV6g2DY3qRPm+KTa2wW0O3nO13uz3e32I5GoxiBqUFPZh0ra7z9S6CBo9G4tFyIGl06z9JlWOzZgE6ADGAAswOOANbg+EyBYyKawfDsagsADSgoR6QyiXhftF4oEksxIYbctKFhCOksxjsF3CQSTPYQ2t0qfb6ZsJqMo6clOM7zryi7Lqu65sJuO5wvC+7pIeCJIiiaJnkGeSXrKuL3K+3RnJ8eqGPGgRUm8PjEvq5jBKE6oATEfwWrmNr2hsLr8swxDkFQdAYsG9bYao9x6BYXSkjcBrqp8RiOO+Hg6NUAzhEM6gkvUNRmgxHKTMCoLgkKCxYEsbHUOkToAJp8ZhAk4kJCCMl0MlPKqoS+O2b5tJ0jynGc+KCHowR1HogHMfmSxTNiBlGSZZmWee-EyrZJT6jYCkfARVxaDJsZaqY3Q+cYWj+YFBghYCwFzguS4rrAUXGRAxaxVZWJXjhpSZt4ng2O84Qie2njdp5eUJmchXFd1BjBVpTGAlM4gQMujopGkXpwv6p7NVhSXCV43SqfU2qqYYWVUm42rHAOcb1L12gsmV0zzYtRbLRku6VqhNboXWiWNi+3j6spfSDB84TqKdZjHAY-kRE05hfMSbLTTms2PXIvJ1SZHFkFxFA0LQm02Y2xiKsyJJNPqNxQ5Scl-hYOgBEVt6fsYqn0QxCioBAcDKNpuDfaG14hIq9T2FcjSWEEgync0XQkv4k1ZQYjQRD8SNjjMcy7MsayQPzrV2XYFQi0rt6+IE9gWFSZR09qZzNN1fRDFEaucrpPJQHrgklF4ej0yJInKRDpIeYg5hKoMZhvGUbxFfRYzIzoeYFuCnvbQgcs+Gb+oib4x1UsE4e9PYZzWLe90VaBUDgTVqeNmLF1GlU9S+FDRpkcLKkhO8Vwkqr8djknrEQLX16spcCl0poRoGE0NztxP1QvmLARPM7-eu9y+mGfVI9tV4RuXOqgSJsSIlUrRJyr8fdT+FUfeMQng8RXsGPDxehPXkvlTVAmQy9Le59JqX2JPiF8gxMyR3LtOSqYFqqrlfrvA2jcfAWH6IYGePtwjnwiCcYqHxbCqk0Jpdekw5oLTRh7d+P1P5nAUp8Dq6hRJeFVKdTovtSR2CaD+TMTQzD3TIU9KACCqECzauLOmYtiZZRqAOVhxJ7ysljCEGSTQ4xs0iEAA */
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
            target: 'initializingFromUrl',
          },
        },
        initializingFromUrl: {
          on: {
            INITIALIZED_FROM_URL: {
              target: 'loading',
              actions: ['storeLogViewReference'],
            },
          },
          invoke: {
            src: 'initializeFromUrl',
          },
        },
        loading: {
          entry: ['notifyLoadingStarted', 'updateContextInUrl'],
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
            CHECKING_STATUS_SUCCEEDED: [
              {
                target: 'resolvedPersistedLogView',
                actions: 'storeStatus',
                cond: 'isPersistedLogView',
              },
              {
                target: 'resolvedInlineLogView',
                actions: 'storeStatus',
              },
            ],
          },
        },
        resolvedPersistedLogView: {
          invoke: {
            src: 'listenForUrlChanges',
          },
          entry: ['notifyLoadingSucceeded', 'updateContextInUrl'],
          on: {
            PERSIST_INLINE_LOG_VIEW: undefined,
            RELOAD_LOG_VIEW: {
              target: 'loading',
            },
            LOG_VIEW_URL_KEY_REMOVED: {
              actions: 'updateContextInUrl',
            },
          },
        },
        resolvedInlineLogView: {
          invoke: {
            src: 'listenForUrlChanges',
          },
          entry: ['notifyLoadingSucceeded', 'updateContextInUrl'],
          on: {
            PERSIST_INLINE_LOG_VIEW: {
              target: 'persistingInlineLogView',
            },
            LOG_VIEW_URL_KEY_REMOVED: {
              actions: 'updateContextInUrl',
            },
          },
        },
        persistingInlineLogView: {
          invoke: {
            src: 'persistInlineLogView',
          },
          on: {
            PERSISTING_INLINE_LOG_VIEW_FAILED: {
              target: 'persistingInlineLogViewFailed',
              actions: 'storeError',
            },
            PERSISTING_INLINE_LOG_VIEW_SUCCEEDED: {
              target: 'resolving',
              actions: ['convertInlineLogViewReferenceToPersistedLogViewReference', 'storeLogView'],
            },
          },
        },
        persistingInlineLogViewFailed: {
          entry: 'notifyPersistingInlineLogViewFailed',
          on: {
            RETRY_PERSISTING_INLINE_LOG_VIEW: {
              target: 'persistingInlineLogView',
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
              actions: ['updateLogViewReference', 'storeLogView'],
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
        LOG_VIEW_REFERENCE_CHANGED: {
          target: '.loading',
          actions: 'storeLogViewReference',
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
        updateContextInUrl: actions.pure(() => undefined),
        storeLogViewReference: assign((context, event) =>
          'logViewReference' in event && event.logViewReference !== null
            ? ({
                logViewReference: event.logViewReference,
              } as LogViewContextWithReference)
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
        convertInlineLogViewReferenceToPersistedLogViewReference: assign((context, event) =>
          'logView' in event && context.logViewReference.type === 'log-view-inline'
            ? ({
                logViewReference: {
                  type: 'log-view-reference',
                  logViewId: context.logViewReference.id,
                },
              } as LogViewContextWithReference)
            : {}
        ),
        updateLogViewReference: assign((context, event) =>
          'attributes' in event && context.logViewReference.type === 'log-view-inline'
            ? ({
                logViewReference: {
                  ...context.logViewReference,
                  attributes: {
                    ...context.logViewReference.attributes,
                    ...event.attributes,
                  },
                },
              } as LogViewContextWithReference)
            : {}
        ),
      },
      services: {
        initializeFromUrl: (_context, _event) => (send) =>
          send({ type: 'INITIALIZED_FROM_URL', logViewReference: null }),
        listenForUrlChanges: (_context, _event) => (send) => {},
      },
      guards: {
        isPersistedLogView: (context, event) =>
          context.logViewReference.type === 'log-view-reference',
      },
    }
  );

export interface LogViewStateMachineDependencies {
  initialContext: LogViewContextWithReference;
  logViews: ILogViewsClient;
  notificationChannel?: NotificationChannel<LogViewContext, LogViewEvent, LogViewNotificationEvent>;
  initializeFromUrl?: InitializeFromUrl;
  updateContextInUrl?: UpdateContextInUrl;
  listenForUrlChanges?: ListenForUrlChanges;
}

export const createLogViewStateMachine = ({
  initialContext,
  logViews,
  notificationChannel,
  initializeFromUrl,
  updateContextInUrl,
  listenForUrlChanges,
}: LogViewStateMachineDependencies) =>
  createPureLogViewStateMachine(initialContext).withConfig({
    actions: {
      ...(notificationChannel != null
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
        : {}),
      ...(updateContextInUrl ? { updateContextInUrl } : {}),
    },
    services: {
      ...(initializeFromUrl ? { initializeFromUrl } : {}),
      ...(listenForUrlChanges ? { listenForUrlChanges } : {}),
      loadLogView: (context) =>
        from(
          'logViewReference' in context
            ? logViews.getLogView(context.logViewReference)
            : throwError(() => new Error('Failed to load log view'))
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
          'logViewReference' in context && event.type === 'UPDATE'
            ? logViews.putLogView(context.logViewReference, event.attributes)
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
      persistInlineLogView: (context, event) =>
        from(
          'logViewReference' in context &&
            event.type === 'PERSIST_INLINE_LOG_VIEW' &&
            context.logViewReference.type === 'log-view-inline'
            ? logViews.putLogView(
                { type: 'log-view-reference', logViewId: context.logViewReference.id },
                context.logViewReference.attributes
              )
            : throwError(() => new Error('Failed to persist inline Log View.'))
        ).pipe(
          map(
            (logView): LogViewEvent => ({
              type: 'PERSISTING_INLINE_LOG_VIEW_SUCCEEDED',
              logView,
            })
          ),
          catchError((error) =>
            of<LogViewEvent>({
              type: 'PERSISTING_INLINE_LOG_VIEW_FAILED',
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
