/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ActorRefFrom } from 'xstate';
import type {
  LogView,
  LogViewAttributes,
  LogViewStatus,
  ResolvedLogView,
} from '../../../../common/log_views';
import { type NotificationChannel } from '../../xstate_helpers';
import { type LogViewNotificationEvent } from './notifications';
import { createLogViewStateMachine } from './state_machine';

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
      type: 'logViewIdChanged';
      logViewId: string;
    }
  | {
      type: 'loadingSucceeded';
      logView: LogView;
    }
  | {
      type: 'loadingFailed';
      error: Error;
    }
  | {
      type: 'resolutionSucceeded';
      resolvedLogView: ResolvedLogView;
    }
  | {
      type: 'update';
      attributes: Partial<LogViewAttributes>;
    }
  | {
      type: 'updatingSucceeded';
      logView: LogView;
    }
  | {
      type: 'updatingFailed';
      error: Error;
    }
  | {
      type: 'resolutionFailed';
      error: Error;
    }
  | {
      type: 'checkingStatusSucceeded';
      status: LogViewStatus;
    }
  | {
      type: 'checkingStatusFailed';
      error: Error;
    }
  | {
      type: 'retry';
    }
  | {
      type: 'reloadLogView';
    };

export type LogViewMachine = ReturnType<typeof createLogViewStateMachine>;
export type LogViewActorRef = ActorRefFrom<LogViewMachine>;
export type LogViewNotificationChannel = NotificationChannel<
  LogViewContext,
  LogViewEvent,
  LogViewNotificationEvent
>;
