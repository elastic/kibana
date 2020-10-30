/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ESQuery } from '../../../common/typed_json';
import { isCompleteResponse, isErrorResponse } from '../../../../../../src/plugins/data/public';
import { inputsModel, State } from '../../common/store';
import { useKibana } from '../../common/lib/kibana';
import { createFilter } from '../../common/containers/helpers';
import { DocValueFields } from '../../common/containers/query_template';
import { timelineActions, timelineSelectors } from '../../timelines/store/timeline';
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

interface UseTimelineEventsProps {
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
}

const getTimelineEvents = (timelineEdges: TimelineEdges[]): TimelineItem[] =>
  timelineEdges.map((e: TimelineEdges) => e.node);

const ID = 'timelineEventsQuery';
const initSortDefault = {
  field: '@timestamp',
  direction: Direction.asc,
};

/*
 * Future Engineer
 * This class is just there to manage temporarily the reload of the active timeline when switching tabs
 * because of the bootstrap of the security solution app, we will always trigger the query
 * to avoid it we will cache its request and response so we can go back where the user was before switching tabs
 *
 * !!! Important !!! this is just there until, we will have a better way to bootstrap the app
 * I did not want to put in the store because I was feeling it will feel less temporarily and I did not want other engineer using it
 *
 */
class ActiveTimelineEvents {
  private _pageName: string = '';
  private _response: TimelineArgs | null = null;

  getPageName() {
    return this._pageName;
  }

  setPageName(pageName: string) {
    this._pageName = pageName;
  }

  getResponse() {
    return this._response;
  }

  setResponse(resp: TimelineArgs) {
    this._response = resp;
  }
}

const activeTimeline = new ActiveTimelineEvents();

/* End */

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
}: UseTimelineEventsProps): [boolean, TimelineArgs] => {
  const [{ pageName }] = useRouteSpy();
  const dispatch = useDispatch();
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const getTimelineActivePageSelector = useMemo(
    () => timelineSelectors.getTimelineActivePage(),
    []
  );
  const activePage = useSelector<State, number>(
    (state) => getTimelineActivePageSelector(state, id) ?? 0
  );

  const [timelineRequest, setTimelineRequest] = useState<TimelineEventsAllRequestOptions | null>(
    !skip
      ? {
          fields: [],
          fieldRequested: fields,
          filterQuery: createFilter(filterQuery),
          id: ID,
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

  const clearSignalsState = useCallback(() => {
    if (id != null && detectionsTimelineIds.some((timelineId) => timelineId === id)) {
      dispatch(timelineActions.clearEventsLoading({ id }));
      dispatch(timelineActions.clearEventsDeleted({ id }));
    }
  }, [dispatch, id]);

  const wrappedLoadPage = useCallback(
    (newActivePage: number) => {
      clearSignalsState();
      dispatch(timelineActions.setActivePage({ id, activePage: newActivePage }));
    },
    [clearSignalsState, dispatch, id]
  );

  const refetchGrid = useCallback(() => {
    refetch.current();
    wrappedLoadPage(0);
  }, [wrappedLoadPage]);

  const [timelineResponse, setTimelineResponse] = useState<TimelineArgs>({
    id: ID,
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
      if (request == null) {
        return;
      }

      if (id === TimelineId.active && pageName !== activeTimeline.getPageName()) {
        abortCtrl.current.abort();
        setLoading(false);
        setTimelineResponse((prevResp) => {
          const resp = activeTimeline.getResponse();
          if (resp != null) {
            return resp;
          }
          return prevResp;
        });
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
                      activeTimeline.setPageName(pageName);
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
    [data.search, id, notifications.toasts, pageName]
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
        id,
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
        dispatch(timelineActions.setActivePage({ id, activePage: 0 }));
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
    docValueFields,
    endDate,
    filterQuery,
    startDate,
    id,
    activePage,
    limit,
    sort,
    skip,
    fields,
  ]);

  useEffect(() => {
    timelineSearch(timelineRequest);
  }, [timelineRequest, timelineSearch]);

  return [loading, timelineResponse];
};
