/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogViewStatus } from '../../../../../common/log_views';
import {
  ListenerEvents as LogViewListenerEvents,
  LogViewActor,
  LogViewContextWithError,
  LogViewContextWithResolvedLogView,
} from '../../../log_view_state';

// if we need any context value in this machine we should turn this into a typestate union
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogStreamPageContext {}

export type LogStreamPageEvent =
  | LogViewListenerEvents
  | {
      type: 'receivedAllParameters';
    };

export interface LogStreamPageContext {
  logViewMachineRef: LogViewActor;
}

export type LogStreamPageTypestate =
  | {
      value: 'uninitialized';
      context: LogStreamPageContext;
    }
  | {
      value: 'loadingLogView';
      context: LogStreamPageContext;
    }
  | {
      value: 'loadingLogViewFailed';
      context: LogStreamPageContext & { logViewError: LogViewContextWithError['error'] };
    }
  | {
      value: 'hasLogViewIndices';
      context: LogStreamPageContext & {
        resolvedLogView: LogViewContextWithResolvedLogView['resolvedLogView'];
        logViewStatus: LogViewStatus;
      };
    }
  | {
      value: 'missingLogViewIndices';
      context: LogStreamPageContext & {
        resolvedLogView: LogViewContextWithResolvedLogView['resolvedLogView'];
        logViewStatus: LogViewStatus;
      };
    };

export type LogStreamPageStateValue = LogStreamPageTypestate['value'];
