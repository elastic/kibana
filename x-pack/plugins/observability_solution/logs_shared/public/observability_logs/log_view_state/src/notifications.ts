/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogViewReference, LogViewStatus, ResolvedLogView } from '../../../../common/log_views';
import { createNotificationChannel } from '../../xstate_helpers';
import { LogViewContext, LogViewEvent } from './types';

export type LogViewNotificationEvent =
  | {
      type: 'LOADING_LOG_VIEW_STARTED';
      logViewReference: LogViewReference;
    }
  | {
      type: 'LOADING_LOG_VIEW_SUCCEEDED';
      resolvedLogView: ResolvedLogView;
      status: LogViewStatus;
    }
  | {
      type: 'LOADING_LOG_VIEW_FAILED';
      error: Error;
    };

export const createLogViewNotificationChannel = () =>
  createNotificationChannel<LogViewContext, LogViewEvent, LogViewNotificationEvent>();

export const logViewNotificationEventSelectors = {
  loadingLogViewStarted: (context: LogViewContext) =>
    'logViewReference' in context
      ? ({
          type: 'LOADING_LOG_VIEW_STARTED',
          logViewReference: context.logViewReference,
        } as LogViewNotificationEvent)
      : undefined,
  loadingLogViewSucceeded: (context: LogViewContext) =>
    'resolvedLogView' in context && 'status' in context
      ? ({
          type: 'LOADING_LOG_VIEW_SUCCEEDED',
          resolvedLogView: context.resolvedLogView,
          status: context.status,
        } as LogViewNotificationEvent)
      : undefined,
  loadingLogViewFailed: (context: LogViewContext) =>
    'error' in context
      ? ({
          type: 'LOADING_LOG_VIEW_FAILED',
          error: context.error,
        } as LogViewNotificationEvent)
      : undefined,
};
