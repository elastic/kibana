/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import { inputsModel } from '../../../common/store';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import {
  DocValueFields,
  TimelineEventsDetailsItem,
  TimelineEventsQueries,
  TimelineEventsDetailsRequestOptions,
  TimelineEventsDetailsStrategyResponse,
} from '../../../../common/search_strategy';
export interface EventsArgs {
  detailsData: TimelineEventsDetailsItem[] | null;
}

export interface UseTimelineEventsDetailsProps {
  docValueFields: DocValueFields[];
  indexName: string;
  eventId: string;
  skip: boolean;
}

export const useTimelineEventsDetails = ({
  docValueFields,
  indexName,
  eventId,
  skip,
}: UseTimelineEventsDetailsProps): [boolean, EventsArgs['detailsData']] => {
  const { data, notifications, uiSettings } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const [loading, setLoading] = useState(false);
  const [
    timelineDetailsRequest,
    setTimelineDetailsRequest,
  ] = useState<TimelineEventsDetailsRequestOptions | null>(null);

  const [timelineDetailsResponse, setTimelineDetailsResponse] = useState<EventsArgs['detailsData']>(
    null
  );

  const timelineDetailsSearch = useCallback(
    (request: TimelineEventsDetailsRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<TimelineEventsDetailsRequestOptions, TimelineEventsDetailsStrategyResponse>(
            request,
            {
              strategy: 'securitySolutionTimelineSearchStrategy',
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setTimelineDetailsResponse(response.data || []);
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
    [data.search, notifications.toasts]
  );

  useEffect(() => {
    setTimelineDetailsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex,
        docValueFields,
        indexName,
        eventId,
        factoryQueryType: TimelineEventsQueries.details,
      };
      if (!skip && !deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [defaultIndex, docValueFields, eventId, indexName, skip]);

  useEffect(() => {
    if (timelineDetailsRequest) {
      timelineDetailsSearch(timelineDetailsRequest);
    }
  }, [timelineDetailsRequest, timelineDetailsSearch]);

  return [loading, timelineDetailsResponse];
};
