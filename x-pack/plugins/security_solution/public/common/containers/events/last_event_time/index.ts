/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
// Prefer  importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { inputsModel } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import {
  TimelineEventsQueries,
  TimelineEventsLastEventTimeRequestOptions,
  TimelineEventsLastEventTimeStrategyResponse,
  LastTimeDetails,
  LastEventIndexKey,
} from '../../../../../common/search_strategy/timeline';
import { AbortError } from '../../../../../../../../src/plugins/data/common';
import { useWithSource } from '../../source';
import * as i18n from './translations';

// const ID = 'timelineEventsLastEventTimeQuery';

export interface UseTimelineLastEventTimeArgs {
  lastSeen: string | null;
  refetch: inputsModel.Refetch;
  errorMessage?: string;
}

interface UseTimelineLastEventTimeProps {
  indexKey: LastEventIndexKey;
  details: LastTimeDetails;
}

export const useTimelineLastEventTime = ({
  indexKey,
  details,
}: UseTimelineLastEventTimeProps): [boolean, UseTimelineLastEventTimeArgs] => {
  const { data, notifications, uiSettings } = useKibana().services;
  const { docValueFields } = useWithSource('default');
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const [loading, setLoading] = useState(false);
  const [TimelineLastEventTimeRequest, setTimelineLastEventTimeRequest] = useState<
    TimelineEventsLastEventTimeRequestOptions
  >({
    defaultIndex,
    factoryQueryType: TimelineEventsQueries.lastEventTime,
    docValueFields,
    indexKey,
    details,
  });

  const [TimelineLastEventTimeResponse, setTimelineLastEventTimeResponse] = useState<
    UseTimelineLastEventTimeArgs
  >({
    lastSeen: null,
    refetch: refetch.current,
    errorMessage: undefined,
  });

  const timelineLastEventTimeSearch = useCallback(
    (request: TimelineEventsLastEventTimeRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<
            TimelineEventsLastEventTimeRequestOptions,
            TimelineEventsLastEventTimeStrategyResponse
          >(request, {
            strategy: 'securitySolutionTimelineSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setTimelineLastEventTimeResponse((prevResponse) => ({
                    ...prevResponse,
                    errorMessage: undefined,
                    lastSeen: response.lastSeen,
                    refetch: refetch.current,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_LAST_EVENT_TIME);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_LAST_EVENT_TIME,
                  text: msg.message,
                });
                setTimelineLastEventTimeResponse((prevResponse) => ({
                  ...prevResponse,
                  errorMessage: msg.message,
                }));
              }
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, notifications.toasts]
  );

  useEffect(() => {
    setTimelineLastEventTimeRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex,
        indexKey,
        details,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [defaultIndex, details, indexKey]);

  useEffect(() => {
    timelineLastEventTimeSearch(TimelineLastEventTimeRequest);
  }, [TimelineLastEventTimeRequest, timelineLastEventTimeSearch]);

  return [loading, TimelineLastEventTimeResponse];
};
