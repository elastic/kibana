/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogViewStatus, ResolvedLogView } from '../../../../common/log_views';
import { createNotificationChannel } from '../../xstate_helpers';
import { LogViewContext, LogViewEvent } from './types';

export type LogViewNotificationEvent =
  | {
      type: 'loadingLogViewStarted';
      logViewId: string;
    }
  | {
      type: 'loadingLogViewSucceeded';
      resolvedLogView: ResolvedLogView;
      status: LogViewStatus;
    }
  | {
      type: 'loadingLogViewFailed';
      error: Error;
    };

export const createLogViewNotificationChannel = () =>
  createNotificationChannel<LogViewContext, LogViewEvent, LogViewNotificationEvent>();

export const logViewNotificationEventSelectors = {
  loadingLogViewStarted: (context: LogViewContext) =>
    'logViewId' in context
      ? ({
          type: 'loadingLogViewStarted',
          logViewId: context.logViewId,
        } as LogViewNotificationEvent)
      : undefined,
  loadingLogViewSucceeded: (context: LogViewContext) =>
    'resolvedLogView' in context && 'status' in context
      ? ({
          type: 'loadingLogViewSucceeded',
          resolvedLogView: context.resolvedLogView,
          status: context.status,
        } as LogViewNotificationEvent)
      : undefined,
  loadingLogViewFailed: (context: LogViewContext) =>
    'error' in context
      ? ({
          type: 'loadingLogViewFailed',
          error: context.error,
        } as LogViewNotificationEvent)
      : undefined,
};
