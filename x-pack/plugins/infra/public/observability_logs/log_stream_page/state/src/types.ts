/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InterpreterFrom } from 'xstate';
import { LogViewStatus } from '../../../../../common/log_views';
import {
  ListenerEvents as LogViewListenerEvents,
  LogViewContextWithError,
  LogViewContextWithResolvedLogView,
  LogViewActorRef,
} from '../../../log_view_state';
import { createLogStreamPageStateMachine } from './state_machine';

export type LogStreamPageEvent =
  | LogViewListenerEvents
  | {
      type: 'receivedAllParameters';
    };

export interface LogStreamPageContext {
  logViewMachineRef: LogViewActorRef;
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
export type LogStreamPageStateContext = LogStreamPageTypestate['context'];

export type LogStreamPageStateMachine = ReturnType<typeof createLogStreamPageStateMachine>;
export type LogStreamPageStateService = InterpreterFrom<LogStreamPageStateMachine>;
