/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';

import { inputsModel } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import {
  TimelineEventsQueries,
  TimelineEventsLastEventTimeRequestOptions,
  TimelineEventsLastEventTimeStrategyResponse,
  LastTimeDetails,
  LastEventIndexKey,
} from '../../../../../common/search_strategy/timeline';
import {
  AbortError,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../../src/plugins/data/common';
import * as i18n from './translations';
import { DocValueFields } from '../../../../../common/search_strategy';

export interface UseTimelineLastEventTimeArgs {
  lastSeen: string | null;
  refetch: inputsModel.Refetch;
  errorMessage?: string;
}

interface UseTimelineLastEventTimeProps {
  docValueFields: DocValueFields[];
  indexKey: LastEventIndexKey;
  indexNames: string[];
  details: LastTimeDetails;
}

export const useTimelineLastEventTime = ({
  docValueFields,
  indexKey,
  indexNames,
  details,
}: UseTimelineLastEventTimeProps): [boolean, UseTimelineLastEventTimeArgs] => {
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [TimelineLastEventTimeRequest, setTimelineLastEventTimeRequest] = useState<
    TimelineEventsLastEventTimeRequestOptions
  >({
    defaultIndex: indexNames,
    docValueFields,
    factoryQueryType: TimelineEventsQueries.lastEventTime,
    indexKey,
    details,
  });

  const [timelineLastEventTimeResponse, setTimelineLastEventTimeResponse] = useState<
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
              if (isCompleteResponse(response)) {
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
              } else if (isErrorResponse(response)) {
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
        defaultIndex: indexNames,
        docValueFields,
        indexKey,
        details,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [indexNames, details, docValueFields, indexKey]);

  useEffect(() => {
    timelineLastEventTimeSearch(TimelineLastEventTimeRequest);
  }, [TimelineLastEventTimeRequest, timelineLastEventTimeSearch]);

  return [loading, timelineLastEventTimeResponse];
};
