/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ActorRef } from 'xstate';
import { LogView, logViewRT, ResolvedLogView } from '../../../../common/log_views';

export const logViewContextWithIdRT = rt.type({
  logViewId: rt.string,
});
export type LogViewContextWithId = rt.TypeOf<typeof logViewContextWithIdRT>;

export const logViewContextWithLogViewRT = rt.type({
  logView: logViewRT,
});
export type LogViewContextWithLogView = rt.TypeOf<typeof logViewContextWithLogViewRT>;

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
