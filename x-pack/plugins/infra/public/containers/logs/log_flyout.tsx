/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { isString } from 'lodash';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { UrlStateContainer } from '../../utils/url_state';
import {
  mapRawResponse,
  useDataSearch,
  useLatestDataSearchRequest,
  // usePipe,
  useSubscription,
} from '../../utils/use_data_search_request';
import { useTrackedPromise } from '../../utils/use_tracked_promise';
// import { fetchLogEntry } from './log_entries/api/fetch_log_entry';
import { useLogSourceContext } from './log_source';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  LogEntry,
  LogEntrySearchRequestParams,
  logEntrySearchRequestParamsRT,
  logEntrySearchResponsePayloadRT,
  LOG_ENTRY_SEARCH_STRATEGY,
} from '../../../common/search_strategies/log_entries/log_entry';

export enum FlyoutVisibility {
  hidden = 'hidden',
  visible = 'visible',
}

export interface FlyoutOptionsUrlState {
  flyoutId?: string | null;
  flyoutVisibility?: string | null;
  surroundingLogsId?: string | null;
}

export const useLogFlyout = () => {
  // const { services } = useKibanaContextForPlugin();
  const { sourceId } = useLogSourceContext();
  const [flyoutVisible, setFlyoutVisibility] = useState<boolean>(false);
  const [flyoutId, setFlyoutId] = useState<string | null>(null);
  const [surroundingLogsId, setSurroundingLogsId] = useState<string | null>(null);

  // const [loadFlyoutItemRequest, loadFlyoutItem] = useTrackedPromise(
  //   {
  //     cancelPreviousOn: 'creation',
  //     createPromise: async () => {
  //       if (!flyoutId) {
  //         throw new Error('Failed to load log entry: Id not specified.');
  //       }
  //       return await fetchLogEntry({ sourceId, logEntryId: flyoutId }, services.data.search);
  //     },
  //   },
  //   [sourceId, flyoutId]
  // );

  // const isLoading = useMemo(() => {
  //   return loadFlyoutItemRequest.state === 'pending';
  // }, [loadFlyoutItemRequest.state]);

  const { search: fetchLogEntry, requests$: logEntrySearchRequests$ } = useDataSearch({
    getRequest: useCallback(() => {
      return flyoutId
        ? {
            request: {
              params: logEntrySearchRequestParamsRT.encode({ sourceId, logEntryId: flyoutId }),
            },
            options: { strategy: LOG_ENTRY_SEARCH_STRATEGY },
          }
        : null;
    }, [sourceId, flyoutId]),
  });

  const { latestResponse, isRunning } = useLatestDataSearchRequest(
    logEntrySearchRequests$,
    decodeLogEntrySearchRequest
  );

  // const { latestResponse, isRunning } = useLatestDataSearchRequest(
  //   logEntryRequests$,
  //   useMemo(
  //     () =>
  //       map((request) => ({
  //         ...request,
  //         response$: request.response$.pipe(
  //           map((response) => ({
  //             ...response,
  //             rawResponse: decodeOrThrow(logEntrySearchResponsePayloadRT)(response.rawResponse),
  //           }))
  //         ),
  //       })),
  //     []
  //   )
  // );

  // const logEntrySearchResponse$ = usePipe(
  //   rawLogEntrySearchResponse$,
  //   pipe(
  //     map((response) => ({
  //       ...response,
  //       response: decodeOrThrow(logEntrySearchResponsePayloadRT)(response.rawResponse),
  //     }))
  //   )
  // );

  // const { latestValue, latestError, isComplete } = useSubscription(logEntrySearchResponse$, null);

  useEffect(() => {
    if (flyoutId) {
      fetchLogEntry();
    }
  }, [fetchLogEntry, flyoutId]);

  return {
    flyoutVisible,
    setFlyoutVisibility,
    flyoutId,
    setFlyoutId,
    surroundingLogsId,
    setSurroundingLogsId,
    isLoading: isRunning,
    flyoutItem: latestResponse?.data ?? null,
    flyoutError: 'todo: error',
    // isLoading,
    // flyoutItem:
    //   loadFlyoutItemRequest.state === 'resolved' ? loadFlyoutItemRequest.value.data : null,
    // flyoutError:
    //   loadFlyoutItemRequest.state === 'rejected' ? `${loadFlyoutItemRequest.value}` : null,
  };
};

export const LogFlyout = createContainer(useLogFlyout);

const decodeLogEntrySearchRequest = mapRawResponse(decodeOrThrow(logEntrySearchResponsePayloadRT));

// const decodeLogEntrySearchRequest = map<{}>((request) => ({
//   ...request,
//   response$: request.response$.pipe(
//     map((response) => ({
//       ...response,
//       rawResponse: decodeOrThrow(logEntrySearchResponsePayloadRT)(response.rawResponse),
//     }))
//   ),
// }));

export const WithFlyoutOptionsUrlState = () => {
  const {
    flyoutVisible,
    setFlyoutVisibility,
    flyoutId,
    setFlyoutId,
    surroundingLogsId,
    setSurroundingLogsId,
  } = useContext(LogFlyout.Context);

  return (
    <UrlStateContainer
      urlState={{
        flyoutVisibility: flyoutVisible ? FlyoutVisibility.visible : FlyoutVisibility.hidden,
        flyoutId,
        surroundingLogsId,
      }}
      urlStateKey="flyoutOptions"
      mapToUrlState={mapToUrlState}
      onChange={(newUrlState) => {
        if (newUrlState && newUrlState.flyoutId) {
          setFlyoutId(newUrlState.flyoutId);
        }
        if (newUrlState && newUrlState.surroundingLogsId) {
          setSurroundingLogsId(newUrlState.surroundingLogsId);
        }
        if (newUrlState && newUrlState.flyoutVisibility === FlyoutVisibility.visible) {
          setFlyoutVisibility(true);
        }
        if (newUrlState && newUrlState.flyoutVisibility === FlyoutVisibility.hidden) {
          setFlyoutVisibility(false);
        }
      }}
      onInitialize={(initialUrlState) => {
        if (initialUrlState && initialUrlState.flyoutId) {
          setFlyoutId(initialUrlState.flyoutId);
        }
        if (initialUrlState && initialUrlState.surroundingLogsId) {
          setSurroundingLogsId(initialUrlState.surroundingLogsId);
        }
        if (initialUrlState && initialUrlState.flyoutVisibility === FlyoutVisibility.visible) {
          setFlyoutVisibility(true);
        }
        if (initialUrlState && initialUrlState.flyoutVisibility === FlyoutVisibility.hidden) {
          setFlyoutVisibility(false);
        }
      }}
    />
  );
};

const mapToUrlState = (value: any): FlyoutOptionsUrlState | undefined =>
  value
    ? {
        flyoutId: mapToFlyoutIdState(value.flyoutId),
        flyoutVisibility: mapToFlyoutVisibilityState(value.flyoutVisibility),
        surroundingLogsId: mapToSurroundingLogsIdState(value.surroundingLogsId),
      }
    : undefined;

const mapToFlyoutIdState = (subject: any) => {
  return subject && isString(subject) ? subject : undefined;
};
const mapToSurroundingLogsIdState = (subject: any) => {
  return subject && isString(subject) ? subject : undefined;
};
const mapToFlyoutVisibilityState = (subject: any) => {
  if (subject) {
    if (subject === 'visible') {
      return FlyoutVisibility.visible;
    }
    if (subject === 'hidden') {
      return FlyoutVisibility.hidden;
    }
  }
};
