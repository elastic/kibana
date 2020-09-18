/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { ESQuery } from '../../../common/typed_json';
import { IIndexPattern } from '../../../../../../src/plugins/data/public';

import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { inputsModel } from '../../common/store';
import { useKibana } from '../../common/lib/kibana';
import { createFilter } from '../../common/containers/helpers';
import { DocValueFields } from '../../common/containers/query_template';
import { EventType } from '../../timelines/store/timeline/model';
import { timelineActions } from '../../timelines/store/timeline';
import { detectionsTimelineIds, skipQueryForDetectionsPage } from './helpers';
import { getInspectResponse } from '../../helpers';
import {
  Direction,
  TimelineEventsQueries,
  TimelineEventsAllStrategyResponse,
  TimelineEventsAllRequestOptions,
  TimelineEdges,
  TimelineItem,
  SortField,
} from '../../../common/search_strategy';
import { InspectResponse } from '../../types';
import * as i18n from './translations';

export interface TimelineArgs {
  events: TimelineItem[];
  id: string;
  inspect: InspectResponse;
  loadPage: LoadPage;
  pageInfo: {
    activePage: number;
    totalPages: number;
  };
  refetch: inputsModel.Refetch;
  totalCount: number;
  updatedAt: number;
}

type LoadPage = (newActivePage: number) => void;

interface UseTimelineEventsProps {
  docValueFields?: DocValueFields[];
  filterQuery?: ESQuery | string;
  skip?: boolean;
  endDate: string;
  eventType?: EventType;
  id: string;
  fields: string[];
  indexPattern?: IIndexPattern;
  indexToAdd?: string[];
  limit: number;
  sort: SortField;
  startDate: string;
  canQueryTimeline?: boolean;
}

const getTimelineEvents = (timelineEdges: TimelineEdges[]): TimelineItem[] =>
  timelineEdges.map((e: TimelineEdges) => e.node);

const ID = 'timelineEventsQuery';

export const useTimelineEvents = ({
  docValueFields,
  endDate,
  eventType = 'raw',
  id = ID,
  indexPattern,
  indexToAdd = [],
  fields,
  filterQuery,
  startDate,
  limit,
  sort = {
    field: '@timestamp',
    direction: Direction.asc,
  },
  canQueryTimeline = true,
}: UseTimelineEventsProps): [boolean, TimelineArgs] => {
  const dispatch = useDispatch();
  const { data, notifications, uiSettings } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const defaultKibanaIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const defaultIndex =
    indexPattern == null || (indexPattern != null && indexPattern.title === '')
      ? [
          ...(['all', 'raw'].includes(eventType) ? defaultKibanaIndex : []),
          ...(['all', 'alert', 'signal'].includes(eventType) ? indexToAdd : []),
        ]
      : indexPattern?.title.split(',') ?? [];
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [timelineRequest, setTimelineRequest] = useState<TimelineEventsAllRequestOptions>({
    fields,
    fieldRequested: fields,
    filterQuery: createFilter(filterQuery),
    id,
    timerange: {
      interval: '12h',
      from: startDate,
      to: endDate,
    },
    pagination: {
      activePage,
      querySize: limit,
    },
    sort,
    defaultIndex,
    docValueFields: docValueFields ?? [],
    factoryQueryType: TimelineEventsQueries.all,
  });

  const clearSignalsState = useCallback(() => {
    if (id != null && detectionsTimelineIds.some((timelineId) => timelineId === id)) {
      dispatch(timelineActions.clearEventsLoading({ id }));
      dispatch(timelineActions.clearEventsDeleted({ id }));
    }
  }, [dispatch, id]);

  const wrappedLoadPage = useCallback(
    (newActivePage: number) => {
      clearSignalsState();
      setActivePage(newActivePage);
    },
    [clearSignalsState]
  );

  const [timelineResponse, setTimelineResponse] = useState<TimelineArgs>({
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    refetch: refetch.current,
    totalCount: -1,
    pageInfo: {
      activePage: 0,
      totalPages: 0,
    },
    events: [],
    loadPage: wrappedLoadPage,
    updatedAt: 0,
  });

  const timelineSearch = useCallback(
    (request: TimelineEventsAllRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<TimelineEventsAllRequestOptions, TimelineEventsAllStrategyResponse>(request, {
            strategy: 'securitySolutionTimelineSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setTimelineResponse((prevResponse) => ({
                    ...prevResponse,
                    events: getTimelineEvents(response.edges),
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    pageInfo: response.pageInfo,
                    refetch: refetch.current,
                    totalCount: response.totalCount,
                    updatedAt: Date.now(),
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                }
                notifications.toasts.addWarning(i18n.ERROR_TIMELINE_EVENTS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (msg.message !== 'Aborted') {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_TIMELINE_EVENTS,
                  text: msg.message,
                });
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
    if (!canQueryTimeline || skipQueryForDetectionsPage(id, defaultIndex)) {
      return;
    }

    setTimelineRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex,
        docValueFields: docValueFields ?? [],
        filterQuery: createFilter(filterQuery),
        pagination: {
          activePage,
          querySize: limit,
        },
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        sort,
      };
      if (
        canQueryTimeline &&
        !skipQueryForDetectionsPage(id, defaultIndex) &&
        !deepEqual(prevRequest, myRequest)
      ) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [
    defaultIndex,
    docValueFields,
    endDate,
    filterQuery,
    startDate,
    canQueryTimeline,
    id,
    activePage,
    limit,
    sort,
  ]);

  useEffect(() => {
    timelineSearch(timelineRequest);
  }, [timelineRequest, timelineSearch]);

  return [loading, timelineResponse];
};
