/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo } from 'react';

import { pickTimeKey } from '../../../../common/time';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../../utils/url_state';
import { LogPositionState, LogPositionStateParams } from './log_position_state';
import { isValidDatemath, datemathToEpochMillis } from '../../../utils/datemath';

/**
 * Url State
 */
interface LogPositionUrlState {
  position: LogPositionStateParams['visibleMidpoint'] | undefined;
  streamLive: boolean;
  start?: string;
  end?: string;
}

const ONE_HOUR = 86400000;

export const WithLogPositionUrlState = () => {
  const {
    visibleMidpoint,
    isStreaming,
    jumpToTargetPosition,
    startLiveStreaming,
    stopLiveStreaming,
    startDate,
    endDate,
    updateDateRange,
    initialize,
  } = useContext(LogPositionState.Context);
  const urlState = useMemo(
    () => ({
      position: visibleMidpoint ? pickTimeKey(visibleMidpoint) : null,
      streamLive: isStreaming,
      start: startDate,
      end: endDate,
    }),
    [visibleMidpoint, isStreaming, startDate, endDate]
  );
  return (
    <UrlStateContainer
      urlState={urlState}
      urlStateKey="logPosition"
      mapToUrlState={mapToUrlState}
      onChange={(newUrlState: LogPositionUrlState | undefined) => {
        if (!newUrlState) {
          return;
        }

        if (newUrlState.start || newUrlState.end) {
          updateDateRange({ startDate: newUrlState.start, endDate: newUrlState.end });
        }

        if (newUrlState.position) {
          jumpToTargetPosition(newUrlState.position);
        }

        if (newUrlState.streamLive) {
          startLiveStreaming();
        } else if (typeof newUrlState.streamLive !== 'undefined' && !newUrlState.streamLive) {
          stopLiveStreaming();
        }
      }}
      onInitialize={(initialUrlState: LogPositionUrlState | undefined) => {
        if (initialUrlState) {
          const initialPosition = initialUrlState.position;
          let initialStartDate = initialUrlState.start || 'now-1d';
          let initialEndDate = initialUrlState.end || 'now';

          if (initialPosition) {
            const initialStartTimestamp = initialStartDate
              ? datemathToEpochMillis(initialStartDate)
              : undefined;
            const initialEndTimestamp = initialEndDate
              ? datemathToEpochMillis(initialEndDate, 'up')
              : undefined;

            // Adjust the start-end range if the target position falls outside
            if (initialStartTimestamp && initialStartTimestamp > initialPosition.time) {
              initialStartDate = new Date(initialPosition.time - ONE_HOUR).toISOString();
            }
            if (initialEndTimestamp && initialEndTimestamp < initialPosition.time) {
              initialEndDate = new Date(initialPosition.time + ONE_HOUR).toISOString();
            }

            jumpToTargetPosition(initialPosition);
          }

          if (initialStartDate || initialEndDate) {
            updateDateRange({ startDate: initialStartDate, endDate: initialEndDate });
          }

          if (initialUrlState.streamLive) {
            startLiveStreaming();
          }
        }

        initialize();
      }}
    />
  );
};

const mapToUrlState = (value: any): LogPositionUrlState | undefined =>
  value
    ? {
        position: mapToPositionUrlState(value.position),
        streamLive: mapToStreamLiveUrlState(value.streamLive),
        start: mapToDate(value.start),
        end: mapToDate(value.end),
      }
    : undefined;

const mapToPositionUrlState = (value: any) =>
  value && typeof value.time === 'number' && typeof value.tiebreaker === 'number'
    ? pickTimeKey(value)
    : undefined;

const mapToStreamLiveUrlState = (value: any) => (typeof value === 'boolean' ? value : false);

const mapToDate = (value: any) => (isValidDatemath(value) ? value : undefined);
export const replaceLogPositionInQueryString = (time: number) =>
  Number.isNaN(time)
    ? (value: string) => value
    : replaceStateKeyInQueryString<LogPositionUrlState>('logPosition', {
        position: {
          time,
          tiebreaker: 0,
        },
        streamLive: false,
      });
