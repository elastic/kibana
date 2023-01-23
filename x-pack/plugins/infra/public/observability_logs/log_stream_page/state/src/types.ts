/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogViewStatus } from '../../../../../common/log_views';
import { ParsedQuery } from '../../../log_stream_query_state';
import { LogStreamQueryNotificationEvent } from '../../../log_stream_query_state/src/notifications';
import type {
  LogViewContextWithError,
  LogViewContextWithResolvedLogView,
  LogViewNotificationEvent,
} from '../../../log_view_state';

export type LogStreamPageEvent =
  | LogViewNotificationEvent
  | LogStreamQueryNotificationEvent
  | {
      type: 'RECEIVED_INITIAL_PARAMETERS';
      validatedQuery: ParsedQuery;
    };

export interface LogStreamPageContextWithLogView {
  logViewStatus: LogViewStatus;
  resolvedLogView: LogViewContextWithResolvedLogView['resolvedLogView'];
}

export interface LogStreamPageContextWithLogViewError {
  logViewError: LogViewContextWithError['error'];
}

export interface LogStreamPageContextWithQuery {
  parsedQuery: ParsedQuery;
}

export type LogStreamPageTypestate =
  | {
      value: 'uninitialized';
      context: {};
    }
  | {
      value: 'loadingLogView';
      context: {};
    }
  | {
      value: 'loadingLogViewFailed';
      context: LogStreamPageContextWithLogViewError;
    }
  | {
      value: 'hasLogViewIndices';
      context: LogStreamPageContextWithLogView;
    }
  | {
      value: { hasLogViewIndices: 'uninitialized' };
      context: LogStreamPageContextWithLogView;
    }
  | {
      value: { hasLogViewIndices: 'initialized' };
      context: LogStreamPageContextWithLogView & LogStreamPageContextWithQuery;
    }
  | {
      value: 'missingLogViewIndices';
      context: LogStreamPageContextWithLogView;
    };

export type LogStreamPageStateValue = LogStreamPageTypestate['value'];
export type LogStreamPageContext = LogStreamPageTypestate['context'];
