/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertConsumers } from '@kbn/rule-data-utils';
import deepEqual from 'fast-deep-equal';
import { isEmpty, isString, noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Subscription } from 'rxjs';
import { tGridActions } from '..';

import {
  DataPublicPluginStart,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../src/plugins/data/public';
import {
  Direction,
  TimelineFactoryQueryTypes,
  TimelineEventsQueries,
  EntityType,
} from '../../common/search_strategy';
import type {
  DocValueFields,
  Inspect,
  PaginationInputPaginated,
  TimelineStrategyResponseType,
  TimelineEdges,
  TimelineEventsAllRequestOptions,
  TimelineEventsAllStrategyResponse,
  TimelineItem,
  TimelineRequestSortField,
} from '../../common/search_strategy';
import type { ESQuery } from '../../common/typed_json';
import type { KueryFilterQueryKind } from '../../common/types/timeline';
import { useAppToasts } from '../hooks/use_app_toasts';
import { TimelineId } from '../store/t_grid/types';
import * as i18n from './translations';

export type InspectResponse = Inspect & { response: string[] };

export const detectionsTimelineIds = [
  TimelineId.detectionsPage,
  TimelineId.detectionsRulesDetailsPage,
];

export type Refetch = () => void;

export interface TimelineArgs {
  consumers: Record<string, number>;
  events: TimelineItem[];
  id: string;
  inspect: InspectResponse;
  loadPage: LoadPage;
  pageInfo: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
  refetch: Refetch;
  totalCount: number;
  updatedAt: number;
}

type LoadPage = (newActivePage: number) => void;

type TimelineRequest<T extends KueryFilterQueryKind> = TimelineEventsAllRequestOptions;

type TimelineResponse<T extends KueryFilterQueryKind> = TimelineEventsAllStrategyResponse;

export interface UseTimelineEventsProps {
  docValueFields?: DocValueFields[];
  filterQuery?: ESQuery | string;
  skip?: boolean;
  endDate: string;
  entityType: EntityType;
  excludeEcsData?: boolean;
  id: string;
  fields: string[];
  indexNames: string[];
  language?: KueryFilterQueryKind;
  limit: number;
  sort?: TimelineRequestSortField[];
  startDate: string;
  timerangeKind?: 'absolute' | 'relative';
  data?: DataPublicPluginStart;
  alertConsumers?: AlertConsumers[];
}

const createFilter = (filterQuery: ESQuery | string | undefined) =>
  isString(filterQuery) ? filterQuery : JSON.stringify(filterQuery);

const getTimelineEvents = (timelineEdges: TimelineEdges[]): TimelineItem[] =>
  timelineEdges.map((e: TimelineEdges) => e.node);

const getInspectResponse = <T extends TimelineFactoryQueryTypes>(
  response: TimelineStrategyResponseType<T>,
  prevResponse: InspectResponse
): InspectResponse => ({
  dsl: response?.inspect?.dsl ?? prevResponse?.dsl ?? [],
  response:
    response != null ? [JSON.stringify(response.rawResponse, null, 2)] : prevResponse?.response,
});

const ID = 'timelineEventsQuery';
export const initSortDefault = [
  {
    field: '@timestamp',
    direction: Direction.asc,
    type: 'number',
  },
];

const NO_CONSUMERS: AlertConsumers[] = [];
export const useTimelineEvents = ({
  alertConsumers = NO_CONSUMERS,
  docValueFields,
  endDate,
  entityType,
  excludeEcsData = false,
  id = ID,
  indexNames,
  fields,
  filterQuery,
  startDate,
  language = 'kuery',
  limit,
  sort = initSortDefault,
  skip = false,
  timerangeKind,
  data,
}: UseTimelineEventsProps): [boolean, TimelineArgs] => {
  const dispatch = useDispatch();
  const refetch = useRef<Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(0);
  const [timelineRequest, setTimelineRequest] = useState<TimelineRequest<typeof language> | null>(
    null
  );
  const prevTimelineRequest = useRef<TimelineRequest<typeof language> | null>(null);

  const clearSignalsState = useCallback(() => {
    if (id != null && detectionsTimelineIds.some((timelineId) => timelineId === id)) {
      dispatch(tGridActions.clearEventsLoading({ id }));
      dispatch(tGridActions.clearEventsDeleted({ id }));
    }
  }, [dispatch, id]);

  const wrappedLoadPage = useCallback(
    (newActivePage: number) => {
      clearSignalsState();
      setActivePage(newActivePage);
    },
    [clearSignalsState]
  );

  const refetchGrid = useCallback(() => {
    if (refetch.current != null) {
      refetch.current();
    }
    wrappedLoadPage(0);
  }, [wrappedLoadPage]);

  const setUpdated = useCallback(
    (updatedAt: number) => {
      dispatch(tGridActions.setTimelineUpdatedAt({ id, updated: updatedAt }));
    },
    [dispatch, id]
  );

  const [timelineResponse, setTimelineResponse] = useState<TimelineArgs>({
    consumers: {},
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
  const { addError, addWarning } = useAppToasts();

  const timelineSearch = useCallback(
    (request: TimelineRequest<typeof language> | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        prevTimelineRequest.current = request;
        abortCtrl.current = new AbortController();
        setLoading(true);
        if (data && data.search) {
          searchSubscription$.current = data.search
            .search<TimelineRequest<typeof language>, TimelineResponse<typeof language>>(
              { ...request, entityType },
              {
                strategy:
                  request.language === 'eql'
                    ? 'timelineEqlSearchStrategy'
                    : 'timelineSearchStrategy',
                abortSignal: abortCtrl.current.signal,
              }
            )
            .subscribe({
              next: (response) => {
                if (isCompleteResponse(response)) {
                  setTimelineResponse((prevResponse) => {
                    const newTimelineResponse = {
                      ...prevResponse,
                      consumers: response.consumers,
                      events: getTimelineEvents(response.edges),
                      inspect: getInspectResponse(response, prevResponse.inspect),
                      pageInfo: response.pageInfo,
                      totalCount: response.totalCount,
                      updatedAt: Date.now(),
                    };
                    setUpdated(newTimelineResponse.updatedAt);
                    return newTimelineResponse;
                  });
                  setLoading(false);

                  searchSubscription$.current.unsubscribe();
                } else if (isErrorResponse(response)) {
                  setLoading(false);
                  addWarning(i18n.ERROR_TIMELINE_EVENTS);
                  searchSubscription$.current.unsubscribe();
                }
              },
              error: (msg) => {
                setLoading(false);
                addError(msg, {
                  title: i18n.FAIL_TIMELINE_EVENTS,
                });
                searchSubscription$.current.unsubscribe();
              },
            });
        }
      };

      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [skip, data, entityType, setUpdated, addWarning, addError]
  );

  useEffect(() => {
    if (indexNames.length === 0) {
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
        alertConsumers,
        defaultIndex: indexNames,
        docValueFields: docValueFields ?? [],
        excludeEcsData,
        factoryQueryType: TimelineEventsQueries.all,
        fieldRequested: fields,
        fields: [],
        filterQuery: createFilter(filterQuery),
        pagination: {
          activePage: newActivePage,
          querySize: limit,
        },
        language,
        sort,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      };

      if (activePage !== newActivePage) {
        setActivePage(newActivePage);
      }
      if (!deepEqual(prevRequest, currentRequest)) {
        return currentRequest;
      }
      return prevRequest;
    });
  }, [
    alertConsumers,
    dispatch,
    indexNames,
    activePage,
    docValueFields,
    endDate,
    excludeEcsData,
    filterQuery,
    id,
    language,
    limit,
    startDate,
    sort,
    fields,
  ]);

  useEffect(() => {
    if (!deepEqual(prevTimelineRequest.current, timelineRequest)) {
      timelineSearch(timelineRequest);
    }
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [id, timelineRequest, timelineSearch, timerangeKind]);

  /*
    cleanup timeline events response when the filters were removed completely
    to avoid displaying previous query results
  */
  useEffect(() => {
    if (isEmpty(filterQuery)) {
      setTimelineResponse({
        consumers: {},
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
    }
  }, [filterQuery, id, refetchGrid, wrappedLoadPage]);

  return [loading, timelineResponse];
};
