/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of, throwError } from 'rxjs';
import { createMachine, actions } from 'xstate';
import { ILogViewsClient } from '../../../services/log_views';
import { createTypestateHelpers } from '../../xstate_helpers';
import {
  logViewContextWithIdRT,
  logViewContextWithLogViewRT,
  LogViewEvent,
  LogViewTypestate,
} from './types';

export const createPureLogViewStateMachine = () =>
  createMachine<{}, LogViewEvent, LogViewTypestate>(
    {
      id: 'LogView',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: {
            target: 'loading',
          },
        },
        loading: {
          invoke: {
            src: 'loadLogView',
          },
          entry: 'notifyLoading',
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
              target: 'resolved',
              actions: 'storeResolvedLogView',
            },
            resolutionFailed: {
              target: 'resolutionFailed',
              actions: 'storeError',
            },
          },
        },
        resolved: {
          on: {
            reloadLogView: {
              target: 'loading',
            },
          },
        },
        loadingFailed: {
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
      },
      on: {
        logViewIdChanged: {
          target: '.loading',
          actions: 'storeLogViewId',
        },
      },
      context: {},
      predictableActionArguments: true,
      preserveActionOrder: true,
    },
    {
      actions: {
        notifyLoading: actions.pure(() => undefined),
        storeLogViewId: logViewStateMachineHelpers.assignOnTransition(
          null,
          'loading',
          'logViewIdChanged',
          (_context, event) => ({
            logViewId: event.logViewId,
          })
        ),
        storeLogView: logViewStateMachineHelpers.assignOnTransition(
          'loading',
          'resolving',
          'loadingSucceeded',
          (context, event) => ({
            ...context,
            logView: event.logView,
          })
        ),
        storeResolvedLogView: logViewStateMachineHelpers.assignOnTransition(
          'resolving',
          'resolved',
          'resolutionSucceeded',
          (context, event) => ({
            ...context,
            resolvedLogView: event.resolvedLogView,
          })
        ),
      },
    }
  );

export const createLogViewStateMachine = ({ logViews }: { logViews: ILogViewsClient }) =>
  createPureLogViewStateMachine().withConfig({
    services: {
      loadLogView: (context) =>
        from(
          logViewContextWithIdRT.is(context)
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
      resolveLogView: (context) =>
        from(
          logViewContextWithLogViewRT.is(context)
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
    },
  });

const logViewStateMachineHelpers = createTypestateHelpers<LogViewTypestate, LogViewEvent>();
