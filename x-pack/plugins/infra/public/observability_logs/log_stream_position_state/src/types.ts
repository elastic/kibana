/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeKey } from '../../../../common/time';
import { ReceivedInitialQueryParametersEvent } from '../../log_stream_page/state';
import { TimeChangedEvent } from '../../log_stream_query_state/src/notifications';

export interface VisiblePositions {
  startKey: TimeKey | null;
  middleKey: TimeKey | null;
  endKey: TimeKey | null;
  pagesAfterEnd: number;
  pagesBeforeStart: number;
}

export interface LogStreamPositionContextWithTargetPosition {
  targetPosition: TimeKey | null;
}

export interface LogStreamPositionContextWithLatestPosition {
  latestPosition: TimeKey | null;
}
export interface LogStreamPositionContextWithVisiblePositions {
  visiblePositions: VisiblePositions;
}
export type LogStreamPositionState = LogStreamPositionContextWithTargetPosition &
  LogStreamPositionContextWithLatestPosition &
  LogStreamPositionContextWithVisiblePositions;

export type LogStreamPositionTypestate =
  | {
      value: 'uninitialized';
      context: LogStreamPositionState;
    }
  | {
      value: 'initialized';
      context: LogStreamPositionState;
    };
export type LogStreamPositionContext = LogStreamPositionTypestate['context'];
export type LogStreamPositionStateValue = LogStreamPositionTypestate['value'];

export interface JumpToTargetPositionEvent {
  type: 'JUMP_TO_TARGET_POSITION';
  targetPosition: Partial<TimeKey> | null;
}

export interface ReportVisiblePositionsEvent {
  type: 'REPORT_VISIBLE_POSITIONS';
  visiblePositions: VisiblePositions;
}

export type LogStreamPositionEvent =
  | {
      type: 'INITIALIZED_FROM_URL';
      latestPosition: TimeKey | null;
      targetPosition: TimeKey | null;
    }
  | ReceivedInitialQueryParametersEvent
  | JumpToTargetPositionEvent
  | ReportVisiblePositionsEvent
  | TimeChangedEvent;
