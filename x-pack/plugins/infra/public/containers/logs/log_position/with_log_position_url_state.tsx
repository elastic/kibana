/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INullableBaseStateContainer, syncState } from '@kbn/kibana-utils-plugin/public';
import { getOrElseW } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { useCallback, useState } from 'react';
import { map } from 'rxjs/operators';
import { timeKeyRT } from '../../../../common/time';
import { datemathStringRT } from '../../../utils/datemath';
import { useKbnUrlStateStorageFromRouterContext } from '../../../utils/kbn_url_state_context';
import { replaceStateKeyInQueryString } from '../../../utils/url_state';

// import { INullableBaseStateContainer, syncState } from '@kbn/kibana-utils-plugin/public';
// import { getOrElseW } from 'fp-ts/lib/Either';
// import { pipe } from 'fp-ts/lib/pipeable';
// import * as rt from 'io-ts';
// import React, { useCallback, useMemo, useState } from 'react';
// import { map } from 'rxjs/operators';
// import { pickTimeKey, timeKeyRT } from '../../../../common/time';
// import { datemathStringRT, datemathToEpochMillis, isValidDatemath } from '../../../utils/datemath';
// import { useKbnUrlStateStorageFromRouterContext } from '../../../utils/kbn_url_state_context';
// import { replaceStateKeyInQueryString, UrlStateContainer } from '../../../utils/url_state';
// import { useLogPositionStateContext } from './log_position_state';

export const logPositionUrlStateRT = rt.intersection([
  rt.type({
    streamLive: rt.boolean,
  }),
  rt.partial({
    position: rt.union([timeKeyRT, rt.null]),
    start: datemathStringRT,
    end: datemathStringRT,
  }),
]);

export type LogPositionUrlState = rt.TypeOf<typeof logPositionUrlStateRT>;

const LOG_POSITION_URL_STATE_KEY = 'logPosition';
const ONE_HOUR = 3600000;

export const useLogPositionUrlStateSync = () => {
  const urlStateStorage = useKbnUrlStateStorageFromRouterContext();

  const [initialStateFromUrl] = useState(() =>
    pipe(
      logPositionUrlStateRT.decode(urlStateStorage.get(LOG_POSITION_URL_STATE_KEY)),
      getOrElseW(() => null)
    )
  );

  const startSyncingWithUrl = useCallback(
    (stateContainer: INullableBaseStateContainer<LogPositionUrlState>) => {
      if (initialStateFromUrl == null) {
        urlStateStorage.set(LOG_POSITION_URL_STATE_KEY, stateContainer.get(), {
          replace: true,
        });
      }

      const { start, stop } = syncState({
        storageKey: LOG_POSITION_URL_STATE_KEY,
        stateContainer: {
          state$: stateContainer.state$.pipe(map(logPositionUrlStateRT.encode)),
          set: (value) =>
            stateContainer.set(
              pipe(
                logPositionUrlStateRT.decode(value),
                getOrElseW(() => null)
              )
            ),
          get: () => logPositionUrlStateRT.encode(stateContainer.get()),
        },
        stateStorage: urlStateStorage,
      });

      start();

      return stop;
    },
    [initialStateFromUrl, urlStateStorage]
  );

  return {
    initialStateFromUrl,
    startSyncingWithUrl,
  };
};

// export const WithLogPositionUrlState = () => {
//   const {
//     visibleMidpoint,
//     isStreaming,
//     jumpToTargetPosition,
//     startLiveStreaming,
//     stopLiveStreaming,
//     startDateExpression,
//     endDateExpression,
//     updateDateRange,
//     initialize,
//   } = useLogPositionStateContext();
//   const urlState = useMemo(
//     () => ({
//       position: visibleMidpoint ? pickTimeKey(visibleMidpoint) : null,
//       streamLive: isStreaming,
//       start: startDateExpression,
//       end: endDateExpression,
//     }),
//     [visibleMidpoint, isStreaming, startDateExpression, endDateExpression]
//   );

//   const handleChange = useCallback(
//     (newUrlState: LogPositionUrlState | undefined) => {
//       if (!newUrlState) {
//         return;
//       }

//       if (newUrlState.start || newUrlState.end) {
//         updateDateRange({
//           startDateExpression: newUrlState.start,
//           endDateExpression: newUrlState.end,
//         });
//       }

//       if (newUrlState.position) {
//         jumpToTargetPosition(newUrlState.position);
//       }

//       if (newUrlState.streamLive) {
//         startLiveStreaming();
//       } else if (typeof newUrlState.streamLive !== 'undefined' && !newUrlState.streamLive) {
//         stopLiveStreaming();
//       }
//     },
//     [jumpToTargetPosition, startLiveStreaming, stopLiveStreaming, updateDateRange]
//   );

//   const handleInitialize = useCallback(
//     (initialUrlState: LogPositionUrlState | undefined) => {
//       if (initialUrlState) {
//         const initialPosition = initialUrlState.position;
//         let initialStartDateExpression = initialUrlState.start;
//         let initialEndDateExpression = initialUrlState.end;

//         if (!initialPosition) {
//           initialStartDateExpression = initialStartDateExpression || 'now-1d';
//           initialEndDateExpression = initialEndDateExpression || 'now';
//         } else {
//           const initialStartTimestamp = initialStartDateExpression
//             ? datemathToEpochMillis(initialStartDateExpression)
//             : undefined;
//           const initialEndTimestamp = initialEndDateExpression
//             ? datemathToEpochMillis(initialEndDateExpression, 'up')
//             : undefined;

//           // Adjust the start-end range if the target position falls outside or if it's not set.
//           if (!initialStartTimestamp || initialStartTimestamp > initialPosition.time) {
//             initialStartDateExpression = new Date(initialPosition.time - ONE_HOUR).toISOString();
//           }

//           if (!initialEndTimestamp || initialEndTimestamp < initialPosition.time) {
//             initialEndDateExpression = new Date(initialPosition.time + ONE_HOUR).toISOString();
//           }

//           jumpToTargetPosition(initialPosition);
//         }

//         if (initialStartDateExpression || initialEndDateExpression) {
//           updateDateRange({
//             startDateExpression: initialStartDateExpression,
//             endDateExpression: initialEndDateExpression,
//           });
//         }

//         if (initialUrlState.streamLive) {
//           startLiveStreaming();
//         }
//       }

//       initialize();
//     },
//     [initialize, jumpToTargetPosition, startLiveStreaming, updateDateRange]
//   );

//   return (
//     <UrlStateContainer
//       urlState={urlState}
//       urlStateKey="logPosition"
//       mapToUrlState={mapToUrlState}
//       onChange={handleChange}
//       onInitialize={handleInitialize}
//     />
//   );
// };

// const mapToUrlState = (value: any): LogPositionUrlState | undefined =>
//   value
//     ? {
//         position: mapToPositionUrlState(value.position),
//         streamLive: mapToStreamLiveUrlState(value.streamLive),
//         start: mapToDate(value.start),
//         end: mapToDate(value.end),
//       }
//     : undefined;

// const mapToPositionUrlState = (value: any) =>
//   value && typeof value.time === 'number' && typeof value.tiebreaker === 'number'
//     ? pickTimeKey(value)
//     : undefined;

// const mapToStreamLiveUrlState = (value: any) => (typeof value === 'boolean' ? value : false);

// const mapToDate = (value: any) => (isValidDatemath(value) ? value : undefined);

export const replaceLogPositionInQueryString = (time: number) =>
  Number.isNaN(time)
    ? (value: string) => value
    : replaceStateKeyInQueryString<LogPositionUrlState>('logPosition', {
        position: {
          time,
          tiebreaker: 0,
        },
        end: new Date(time + ONE_HOUR).toISOString(),
        start: new Date(time - ONE_HOUR).toISOString(),
        streamLive: false,
      });
