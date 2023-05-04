/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogStreamPositionContext,
  LogStreamPositionContextWithLatestPosition,
  LogStreamPositionContextWithTargetPosition,
  LogStreamPositionContextWithVisiblePositions,
} from './types';

export type PositionsChangedEvent = {
  type: 'POSITIONS_CHANGED';
} & LogStreamPositionContextWithTargetPosition &
  LogStreamPositionContextWithLatestPosition &
  LogStreamPositionContextWithVisiblePositions;

export interface PageEndBufferReachedEvent {
  type: 'PAGE_END_BUFFER_REACHED';
}

export type LogStreamPositionNotificationEvent = PositionsChangedEvent | PageEndBufferReachedEvent;

export const LogStreamPositionNotificationEventSelectors = {
  positionsChanged: (context: LogStreamPositionContext) => {
    return 'targetPosition' in context &&
      'latestPosition' in context &&
      'visiblePositions' in context
      ? ({
          type: 'POSITIONS_CHANGED',
          targetPosition: context.targetPosition,
          latestPosition: context.latestPosition,
          visiblePositions: context.visiblePositions,
        } as LogStreamPositionNotificationEvent)
      : undefined;
  },
  pageEndBufferReached: (context: LogStreamPositionContext) =>
    ({
      type: 'PAGE_END_BUFFER_REACHED',
    } as LogStreamPositionNotificationEvent),
};
