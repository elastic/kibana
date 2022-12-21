/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogViewStatus } from '../../../../../common/log_views';
import type {
  LogViewContextWithError,
  LogViewContextWithResolvedLogView,
  LogViewNotificationEvent,
} from '../../../log_view_state';

export type LogStreamPageEvent =
  | LogViewNotificationEvent
  | {
      type: 'RECEIVED_ALL_PARAMETERS';
    };

export interface LogStreamPageContextWithLogView {
  logViewStatus: LogViewStatus;
  resolvedLogView: LogViewContextWithResolvedLogView['resolvedLogView'];
}

export interface LogStreamPageContextWithLogViewError {
  logViewError: LogViewContextWithError['error'];
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
      value: 'missingLogViewIndices';
      context: LogStreamPageContextWithLogView;
    };

export type LogStreamPageStateValue = LogStreamPageTypestate['value'];
export type LogStreamPageContext = LogStreamPageTypestate['context'];
