/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import { inputsModel } from '../../../common/store';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import {
  DocValueFields,
  DetailItem,
  TimelineQueries,
  TimelineDetailsRequestOptions,
  TimelineDetailsStrategyResponse,
} from '../../../../common/search_strategy';
export interface EventsArgs {
  detailsData: DetailItem[] | null;
  loading: boolean;
}

export interface TimelineDetailsProps {
  docValueFields: DocValueFields[];
  indexName: string;
  eventId: string;
  executeQuery: boolean;
}

const getDetailsEvent = memoizeOne(
  (variables: string, detail: DetailItem[]): DetailItem[] => detail
);

export const useTimelineDetails = ({
  docValueFields,
  indexName,
  eventId,
  executeQuery,
}: TimelineDetailsProps): [boolean, EventsArgs['detailsData']] => {
  const { data, notifications, uiSettings } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const [loading, setLoading] = useState(false);
  const [timelineDetailsRequest, setTimelineDetailsRequest] = useState<
    TimelineDetailsRequestOptions
  >({
    defaultIndex,
    docValueFields,
    executeQuery,
    indexName,
    eventId,
    factoryQueryType: TimelineQueries.details,
  });

  const [timelineDetailsResponse, setTimelineDetailsResponse] = useState<EventsArgs['detailsData']>(
    null
  );

  const timelineDetailsSearch = useCallback(
    (request: TimelineDetailsRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<TimelineDetailsRequestOptions, TimelineDetailsStrategyResponse>(request, {
            strategy: 'securitySolutionTimelineSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setTimelineDetailsResponse(
                    getDetailsEvent(JSON.stringify(timelineDetailsRequest), response.data || [])
                  );
                }
                searchSubscription$.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning('An error has occurred');
                searchSubscription$.unsubscribe();
              }
            },
            error: () => {
              notifications.toasts.addDanger('Failed to run search');
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
    [data.search, notifications.toasts, timelineDetailsRequest]
  );

  useEffect(() => {
    setTimelineDetailsRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex,
        docValueFields,
        indexName,
        eventId,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [defaultIndex, docValueFields, eventId, indexName]);

  useEffect(() => {
    if (executeQuery) timelineDetailsSearch(timelineDetailsRequest);
  }, [executeQuery, timelineDetailsRequest, timelineDetailsSearch]);

  return [loading, timelineDetailsResponse];
};
