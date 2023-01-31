/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActorRef } from 'xstate';
import type {
  LogView,
  LogViewAttributes,
  LogViewStatus,
  ResolvedLogView,
} from '../../../../common/log_views';
import { type NotificationChannel } from '../../xstate_helpers';
import { type LogViewNotificationEvent } from './notifications';

export interface LogViewContextWithId {
  logViewId: string;
}

export interface LogViewContextWithLogView {
  logView: LogView;
}

export interface LogViewContextWithResolvedLogView {
  resolvedLogView: ResolvedLogView;
}

export interface LogViewContextWithStatus {
  status: LogViewStatus;
}

export interface LogViewContextWithError {
  error: Error;
}

export type LogViewTypestate =
  | {
      value: 'uninitialized';
      context: LogViewContextWithId;
    }
  | {
      value: 'loading';
      context: LogViewContextWithId;
    }
  | {
      value: 'resolving';
      context: LogViewContextWithId & LogViewContextWithLogView;
    }
  | {
      value: 'checkingStatus';
      context: LogViewContextWithId & LogViewContextWithLogView & LogViewContextWithResolvedLogView;
    }
  | {
      value: 'resolved';
      context: LogViewContextWithId &
        LogViewContextWithLogView &
        LogViewContextWithResolvedLogView &
        LogViewContextWithStatus;
    }
  | {
      value: 'updating';
      context: LogViewContextWithId;
    }
  | {
      value: 'loadingFailed';
      context: LogViewContextWithId & LogViewContextWithError;
    }
  | {
      value: 'updatingFailed';
      context: LogViewContextWithId & LogViewContextWithError;
    }
  | {
      value: 'resolutionFailed';
      context: LogViewContextWithId & LogViewContextWithLogView & LogViewContextWithError;
    }
  | {
      value: 'checkingStatusFailed';
      context: LogViewContextWithId & LogViewContextWithLogView & LogViewContextWithError;
    };

export type LogViewContext = LogViewTypestate['context'];

export type LogViewStateValue = LogViewTypestate['value'];

export type LogViewEvent =
  | {
      type: 'LOG_VIEW_ID_CHANGED';
      logViewId: string;
    }
  | {
      type: 'LOADING_SUCCEEDED';
      logView: LogView;
    }
  | {
      type: 'LOADING_FAILED';
      error: Error;
    }
  | {
      type: 'RESOLUTION_SUCCEEDED';
      resolvedLogView: ResolvedLogView;
    }
  | {
      type: 'UPDATE';
      attributes: Partial<LogViewAttributes>;
    }
  | {
      type: 'UPDATING_SUCCEEDED';
      logView: LogView;
    }
  | {
      type: 'UPDATING_FAILED';
      error: Error;
    }
  | {
      type: 'RESOLUTION_FAILED';
      error: Error;
    }
  | {
      type: 'CHECKING_STATUS_SUCCEEDED';
      status: LogViewStatus;
    }
  | {
      type: 'CHECKING_STATUS_FAILED';
      error: Error;
    }
  | {
      type: 'RETRY';
    }
  | {
      type: 'RELOAD_LOG_VIEW';
    };

export type LogViewActorRef = ActorRef<LogViewEvent, LogViewContext>;
export type LogViewNotificationChannel = NotificationChannel<
  LogViewContext,
  LogViewEvent,
  LogViewNotificationEvent
>;
