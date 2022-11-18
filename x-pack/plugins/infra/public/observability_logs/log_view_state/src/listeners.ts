/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResolvedLogView } from '../../../../common/log_views';
import { LogViewContext } from './types';

export type ListenerEvents =
  | {
      type: 'loadingLogViewStarted';
      logViewId: string;
    }
  | {
      type: 'loadingLogViewSucceeded';
      resolvedLogView: ResolvedLogView;
    }
  | {
      type: 'loadingLogViewFailed';
      error: Error;
    };

export const logViewListenerEventSelectors = {
  loadingLogViewStarted: (context: LogViewContext) =>
    'logViewId' in context
      ? {
          type: 'loadingLogViewStarted',
          logViewId: context.logViewId,
        }
      : undefined,
  loadingLogViewSucceeded: (context: LogViewContext) =>
    'resolvedLogView' in context
      ? {
          type: 'loadingLogViewStarted',
          resolvedLogView: context.resolvedLogView,
        }
      : undefined,
  loadingLogViewFailed: (context: LogViewContext) =>
    'error' in context
      ? {
          type: 'loadingLogViewFailed',
          error: context.error,
        }
      : undefined,
};
