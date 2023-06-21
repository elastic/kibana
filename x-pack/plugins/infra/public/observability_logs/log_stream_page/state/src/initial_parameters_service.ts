/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshInterval } from '@kbn/data-plugin/public';
import { InvokeCreator, Receiver } from 'xstate';
import { TimeKey } from '../../../../../common/time';
import { VisiblePositions } from '../../../log_stream_position_state';
import { ExtendedTimeRange, ParsedQuery, Timestamps } from '../../../log_stream_query_state';
import { LogStreamPageContext, LogStreamPageEvent } from './types';

export const waitForInitialQueryParameters =
  (): InvokeCreator<LogStreamPageContext, LogStreamPageEvent> =>
  (_context, _event) =>
  (send, onEvent: Receiver<LogStreamPageEvent>) => {
    // constituents of the set of initial parameters
    let latestValidQuery: ParsedQuery | undefined;
    let latestTimeRange: ExtendedTimeRange | undefined;
    let latestRefreshInterval: RefreshInterval | undefined;
    let latestTimestamps: Timestamps | undefined;

    onEvent((event) => {
      switch (event.type) {
        // event types that deliver the parameters
        case 'VALID_QUERY_CHANGED':
        case 'INVALID_QUERY_CHANGED':
          latestValidQuery = event.parsedQuery;
          break;
        case 'TIME_CHANGED':
          latestTimeRange = event.timeRange;
          latestRefreshInterval = event.refreshInterval;
          latestTimestamps = event.timestamps;
          break;
      }

      // if all constituents of the parameters have been delivered
      if (
        latestValidQuery !== undefined &&
        latestTimeRange !== undefined &&
        latestRefreshInterval !== undefined &&
        latestTimestamps !== undefined
      ) {
        send({
          type: 'RECEIVED_INITIAL_QUERY_PARAMETERS',
          validatedQuery: latestValidQuery,
          timeRange: latestTimeRange,
          refreshInterval: latestRefreshInterval,
          timestamps: latestTimestamps,
        });
      }
    });
  };

export const waitForInitialPositionParameters =
  (): InvokeCreator<LogStreamPageContext, LogStreamPageEvent> =>
  (_context, _event) =>
  (send, onEvent: Receiver<LogStreamPageEvent>) => {
    // constituents of the set of initial parameters
    let latestTargetPosition: TimeKey | null;
    let latestLatestPosition: TimeKey | null;
    let latestVisiblePositions: VisiblePositions;

    onEvent((event) => {
      switch (event.type) {
        case 'POSITIONS_CHANGED':
          latestTargetPosition = event.targetPosition;
          latestLatestPosition = event.latestPosition;
          latestVisiblePositions = event.visiblePositions;
          break;
      }

      // if all constituents of the parameters have been delivered
      if (
        latestTargetPosition !== undefined &&
        latestLatestPosition !== undefined &&
        latestVisiblePositions !== undefined
      ) {
        send({
          type: 'RECEIVED_INITIAL_POSITION_PARAMETERS',
          targetPosition: latestTargetPosition,
          latestPosition: latestLatestPosition,
          visiblePositions: latestVisiblePositions,
        });
      }
    });
  };
