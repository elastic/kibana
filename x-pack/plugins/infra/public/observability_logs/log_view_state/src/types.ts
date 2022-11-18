/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActorRef } from 'xstate';
import { LogView, ResolvedLogView } from '../../../../common/log_views';

export interface LogViewContextWithId {
  logViewId: string;
}

export interface LogViewContextWithLogView {
  logView: LogView;
}

export interface LogViewContextWithResolvedLogView {
  resolvedLogView: ResolvedLogView;
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
      value: 'resolved';
      context: LogViewContextWithId & LogViewContextWithLogView & LogViewContextWithResolvedLogView;
    }
  | {
      value: 'loadingFailed';
      context: LogViewContextWithId & LogViewContextWithError;
    }
  | {
      value: 'resolutionFailed';
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
      type: 'resolutionFailed';
      error: Error;
    }
  | {
      type: 'retry';
    }
  | {
      type: 'reloadLogView';
    };

export type LogViewActor = ActorRef<LogViewEvent>;
