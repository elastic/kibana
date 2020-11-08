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
import { isCompleteResponse, isErrorResponse } from '../../../../../../src/plugins/data/public';
import { inputsModel } from '../../common/store';
import { useKibana } from '../../common/lib/kibana';
import { createFilter } from '../../common/containers/helpers';
import { DocValueFields } from '../../common/containers/query_template';
import { timelineActions } from '../../timelines/store/timeline';
import { detectionsTimelineIds, skipQueryForDetectionsPage } from './helpers';
import { getInspectResponse } from '../../helpers';
import {
  Direction,
  PaginationInputPaginated,
  TimelineEventsQueries,
  TimelineEventsAllStrategyResponse,
  TimelineEventsAllRequestOptions,
  TimelineEdges,
  TimelineItem,
  SortField,
} from '../../../common/search_strategy';
import { InspectResponse } from '../../types';
import * as i18n from './translations';
import { TimelineId } from '../../../common/types/timeline';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { activeTimeline } from './active_timeline_context';

export interface TimelineArgs {
  events: TimelineItem[];
  id: string;
  inspect: InspectResponse;
  loadPage: LoadPage;
  pageInfo: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
  refetch: inputsModel.Refetch;
  totalCount: number;
  updatedAt: number;
}

type LoadPage = (newActivePage: number) => void;

export interface UseTimelineEventsProps {
  docValueFields?: DocValueFields[];
  filterQuery?: ESQuery | string;
  skip?: boolean;
  endDate: string;
  id: string;
  fields: string[];
  indexNames: string[];
  limit: number;
  sort: SortField;
  startDate: string;
  timerangeKind?: 'absolute' | 'relative';
}

const getTimelineEvents = (timelineEdges: TimelineEdges[]): TimelineItem[] =>
  timelineEdges.map((e: TimelineEdges) => e.node);

const ID = 'timelineEventsQuery';
export const initSortDefault = {
  field: '@timestamp',
  direction: Direction.asc,
};

function usePreviousRequest(value: TimelineEventsAllRequestOptions | null) {
  const ref = useRef<TimelineEventsAllRequestOptions | null>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const useTimelineEvents = ({
  docValueFields,
  endDate,
  id = ID,
  indexNames,
  fields,
  filterQuery,
  startDate,
  limit,
  sort = initSortDefault,
  skip = false,
  timerangeKind,
}: UseTimelineEventsProps): [boolean, TimelineArgs] => {
  const [{ pageName }] = useRouteSpy();
  const dispatch = useDispatch();
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState(
    id === TimelineId.active ? activeTimeline.getActivePage() : 0
  );
  const [timelineRequest, setTimelineRequest] = useState<TimelineEventsAllRequestOptions | null>(
    !skip
      ? {
          fields: [],
          fieldRequested: fields,
          filterQuery: createFilter(filterQuery),
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
          defaultIndex: indexNames,
          docValueFields: docValueFields ?? [],
          factoryQueryType: TimelineEventsQueries.all,
        }
      : null
  );
  const prevTimelineRequest = usePreviousRequest(timelineRequest);

  const clearSignalsState = useCallback(() => {
    if (id != null && detectionsTimelineIds.some((timelineId) => timelineId === id)) {
      dispatch(timelineActions.clearEventsLoading({ id }));
      dispatch(timelineActions.clearEventsDeleted({ id }));
    }
  }, [dispatch, id]);

  const wrappedLoadPage = useCallback(
    (newActivePage: number) => {
      clearSignalsState();

      if (id === TimelineId.active) {
        activeTimeline.setExpandedEvent({});
        activeTimeline.setActivePage(newActivePage);
      }

      setActivePage(newActivePage);
    },
    [clearSignalsState, id]
  );

  const refetchGrid = useCallback(() => {
    if (refetch.current != null) {
      refetch.current();
    }
    wrappedLoadPage(0);
  }, [wrappedLoadPage]);

  const [timelineResponse, setTimelineResponse] = useState<TimelineArgs>({
    id,
    inspect: {
      dsl: [],
      response: [],
    },
    refetch: refetchGrid,
    totalCount: -1,
    pageInfo: {
      activePage: 0,
      querySize: 0,
    },
    events: [],
    loadPage: wrappedLoadPage,
    updatedAt: 0,
  });

  const timelineSearch = useCallback(
    (request: TimelineEventsAllRequestOptions | null) => {
      if (request == null || pageName === '') {
        return;
      }
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
              try {
                if (isCompleteResponse(response)) {
                  if (!didCancel) {
                    setLoading(false);

                    setTimelineResponse((prevResponse) => {
                      const newTimelineResponse = {
                        ...prevResponse,
                        events: getTimelineEvents(response.edges),
                        inspect: getInspectResponse(response, prevResponse.inspect),
                        pageInfo: response.pageInfo,
                        totalCount: response.totalCount,
                        updatedAt: Date.now(),
                      };
                      if (id === TimelineId.active) {
                        activeTimeline.setExpandedEvent({});
                        activeTimeline.setPageName(pageName);
                        activeTimeline.setRequest(request);
                        activeTimeline.setResponse(newTimelineResponse);
                      }
                      return newTimelineResponse;
                    });
                  }
                  searchSubscription$.unsubscribe();
                } else if (isErrorResponse(response)) {
                  if (!didCancel) {
                    setLoading(false);
                  }
                  notifications.toasts.addWarning(i18n.ERROR_TIMELINE_EVENTS);
                  searchSubscription$.unsubscribe();
                }
              } catch {
                notifications.toasts.addWarning(i18n.ERROR_TIMELINE_EVENTS);
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

      if (
        id === TimelineId.active &&
        activeTimeline.getPageName() !== '' &&
        pageName !== activeTimeline.getPageName()
      ) {
        activeTimeline.setPageName(pageName);

        abortCtrl.current.abort();
        setLoading(false);
        refetch.current = asyncSearch.bind(null, activeTimeline.getRequest());
        setTimelineResponse((prevResp) => {
          const resp = activeTimeline.getResponse();
          if (resp != null) {
            return {
              ...resp,
              refetch: refetchGrid,
              loadPage: wrappedLoadPage,
            };
          }
          return prevResp;
        });
        if (activeTimeline.getResponse() != null) {
          return;
        }
      }

      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;

      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, id, notifications.toasts, pageName, refetchGrid, wrappedLoadPage]
  );

  useEffect(() => {
    if (skip || skipQueryForDetectionsPage(id, indexNames) || indexNames.length === 0) {
      return;
    }

    setTimelineRequest((prevRequest) => {
      const prevSearchParameters = {
        defaultIndex: prevRequest?.defaultIndex ?? [],
        filterQuery: prevRequest?.filterQuery ?? '',
        querySize: prevRequest?.pagination.querySize ?? 0,
        sort: prevRequest?.sort ?? initSortDefault,
        timerange: prevRequest?.timerange ?? {},
      };

      const currentSearchParameters = {
        defaultIndex: indexNames,
        filterQuery: createFilter(filterQuery),
        querySize: limit,
        sort,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      };

      const newActivePage = deepEqual(prevSearchParameters, currentSearchParameters)
        ? activePage
        : 0;

      const currentRequest = {
        defaultIndex: indexNames,
        docValueFields: docValueFields ?? [],
        factoryQueryType: TimelineEventsQueries.all,
        fieldRequested: fields,
        fields: [],
        filterQuery: createFilter(filterQuery),
        pagination: {
          activePage: newActivePage,
          querySize: limit,
        },
        sort,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      };

      if (activePage !== newActivePage) {
        setActivePage(newActivePage);
        if (id === TimelineId.active) {
          activeTimeline.setActivePage(newActivePage);
        }
      }
      if (
        !skip &&
        !skipQueryForDetectionsPage(id, indexNames) &&
        !deepEqual(prevRequest, currentRequest)
      ) {
        return currentRequest;
      }
      return prevRequest;
    });
  }, [
    dispatch,
    indexNames,
    activePage,
    docValueFields,
    endDate,
    filterQuery,
    id,
    limit,
    startDate,
    sort,
    skip,
    fields,
  ]);

  useEffect(() => {
    if (
      id !== TimelineId.active ||
      timerangeKind === 'absolute' ||
      !deepEqual(prevTimelineRequest, timelineRequest)
    )
      timelineSearch(timelineRequest);
  }, [id, prevTimelineRequest, timelineRequest, timelineSearch, timerangeKind]);

  return [loading, timelineResponse];
};
