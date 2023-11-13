/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '@kbn/es-query';
import type { LogViewStatus } from '@kbn/logs-shared-plugin/common';
import type {
  LogViewContextWithError,
  LogViewContextWithResolvedLogView,
  LogViewNotificationEvent,
} from '@kbn/logs-shared-plugin/public';
import { TimeKey } from '../../../../../common/time';
import {
  JumpToTargetPositionEvent,
  LogStreamPositionContext,
  ReportVisiblePositionsEvent,
  VisiblePositions,
} from '../../../log_stream_position_state';
import { LogStreamPositionNotificationEvent } from '../../../log_stream_position_state/src/notifications';
import {
  LogStreamQueryContextWithTime,
  ParsedQuery,
  UpdateRefreshIntervalEvent,
  UpdateTimeRangeEvent,
} from '../../../log_stream_query_state';
import { LogStreamQueryNotificationEvent } from '../../../log_stream_query_state/src/notifications';

export interface ReceivedInitialQueryParametersEvent {
  type: 'RECEIVED_INITIAL_QUERY_PARAMETERS';
  validatedQuery: ParsedQuery;
  timeRange: LogStreamPageContextWithTime['timeRange'];
  refreshInterval: LogStreamPageContextWithTime['refreshInterval'];
  timestamps: LogStreamPageContextWithTime['timestamps'];
}

export interface ReceivedInitialPositionParametersEvent {
  type: 'RECEIVED_INITIAL_POSITION_PARAMETERS';
  targetPosition: LogStreamPageContextWithPositions['targetPosition'];
  latestPosition: LogStreamPageContextWithPositions['latestPosition'];
  visiblePositions: LogStreamPageContextWithPositions['visiblePositions'];
}

export type LogStreamPageEvent =
  | LogViewNotificationEvent
  | LogStreamQueryNotificationEvent
  | LogStreamPositionNotificationEvent
  | ReceivedInitialQueryParametersEvent
  | ReceivedInitialPositionParametersEvent
  | JumpToTargetPositionEvent
  | ReportVisiblePositionsEvent
  | UpdateTimeRangeEvent
  | UpdateRefreshIntervalEvent;

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

export type LogStreamPageContextWithTime = LogStreamQueryContextWithTime;
export type LogStreamPageContextWithPositions = LogStreamPositionContext;

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
      context: LogStreamPageContextWithLogView &
        LogStreamPageContextWithQuery &
        LogStreamPageContextWithTime &
        LogStreamPageContextWithPositions;
    }
  | {
      value: 'missingLogViewIndices';
      context: LogStreamPageContextWithLogView;
    };

export type LogStreamPageStateValue = LogStreamPageTypestate['value'];
export type LogStreamPageContext = LogStreamPageTypestate['context'];

export interface LogStreamPageCallbacks {
  updateTimeRange: (timeRange: Partial<TimeRange>) => void;
  jumpToTargetPosition: (targetPosition: TimeKey | null) => void;
  jumpToTargetPositionTime: (time: string) => void;
  reportVisiblePositions: (visiblePositions: VisiblePositions) => void;
  startLiveStreaming: () => void;
  stopLiveStreaming: () => void;
}
