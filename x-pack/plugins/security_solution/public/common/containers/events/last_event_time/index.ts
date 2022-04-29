/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/common';
import { inputsModel } from '../../../store';
import { useKibana } from '../../../lib/kibana';
import {
  TimelineEventsQueries,
  TimelineEventsLastEventTimeRequestOptions,
  TimelineEventsLastEventTimeStrategyResponse,
  LastTimeDetails,
  LastEventIndexKey,
} from '../../../../../common/search_strategy/timeline';
import * as i18n from './translations';
import { DocValueFields } from '../../../../../common/search_strategy';
import { useAppToasts } from '../../../hooks/use_app_toasts';

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
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [TimelineLastEventTimeRequest, setTimelineLastEventTimeRequest] =
    useState<TimelineEventsLastEventTimeRequestOptions>({
      defaultIndex: indexNames,
      docValueFields,
      factoryQueryType: TimelineEventsQueries.lastEventTime,
      indexKey,
      details,
    });

  const [timelineLastEventTimeResponse, setTimelineLastEventTimeResponse] =
    useState<UseTimelineLastEventTimeArgs>({
      lastSeen: null,
      refetch: refetch.current,
      errorMessage: undefined,
    });
  const { addError, addWarning } = useAppToasts();

  const timelineLastEventTimeSearch = useCallback(
    (request: TimelineEventsLastEventTimeRequestOptions) => {
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<
            TimelineEventsLastEventTimeRequestOptions,
            TimelineEventsLastEventTimeStrategyResponse
          >(request, {
            strategy: 'timelineSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setTimelineLastEventTimeResponse((prevResponse) => ({
                  ...prevResponse,
                  errorMessage: undefined,
                  lastSeen: response.lastSeen,
                  refetch: refetch.current,
                }));
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_LAST_EVENT_TIME);
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_LAST_EVENT_TIME,
              });
              setTimelineLastEventTimeResponse((prevResponse) => ({
                ...prevResponse,
                errorMessage: msg.message,
              }));
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, addError, addWarning]
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
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [TimelineLastEventTimeRequest, timelineLastEventTimeSearch]);

  return [loading, timelineLastEventTimeResponse];
};
