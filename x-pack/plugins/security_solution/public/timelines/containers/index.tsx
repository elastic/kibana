/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { isEmpty, noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Subscription } from 'rxjs';

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DataView, isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/common';
import { ESQuery } from '../../../common/typed_json';

import { inputsModel } from '../../common/store';
import { useKibana } from '../../common/lib/kibana';
import { createFilter } from '../../common/containers/helpers';
import { timelineActions } from '../store/timeline';
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
  TimelineRequestSortField,
  DocValueFields,
} from '../../../common/search_strategy';
import { InspectResponse } from '../../types';
import * as i18n from './translations';
import { KueryFilterQueryKind, TimelineId } from '../../../common/types/timeline';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { activeTimeline } from './active_timeline_context';
import {
  EqlOptionsSelected,
  TimelineEqlRequestOptions,
  TimelineEqlResponse,
} from '../../../common/search_strategy/timeline/events/eql';
import { useAppToasts } from '../../common/hooks/use_app_toasts';

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

type TimelineRequest<T extends KueryFilterQueryKind> = T extends 'kuery'
  ? TimelineEventsAllRequestOptions
  : T extends 'lucene'
  ? TimelineEventsAllRequestOptions
  : T extends 'eql'
  ? TimelineEqlRequestOptions
  : TimelineEventsAllRequestOptions;

type TimelineResponse<T extends KueryFilterQueryKind> = T extends 'kuery'
  ? TimelineEventsAllStrategyResponse
  : T extends 'lucene'
  ? TimelineEventsAllStrategyResponse
  : T extends 'eql'
  ? TimelineEqlResponse
  : TimelineEventsAllStrategyResponse;

export interface UseTimelineEventsProps {
  dataViewId: string | null;
  docValueFields?: DocValueFields[];
  endDate: string;
  eqlOptions?: EqlOptionsSelected;
  fields: string[];
  filterQuery?: ESQuery | string;
  id: string;
  indexNames: string[];
  language?: KueryFilterQueryKind;
  limit: number;
  runtimeMappings: MappingRuntimeFields;
  skip?: boolean;
  sort?: TimelineRequestSortField[];
  startDate: string;
  timerangeKind?: 'absolute' | 'relative';
}

const getTimelineEvents = (timelineEdges: TimelineEdges[]): TimelineItem[] =>
  timelineEdges.map((e: TimelineEdges) => e.node);

const ID = 'timelineEventsQuery';
export const initSortDefault = [
  {
    field: '@timestamp',
    direction: Direction.asc,
    type: 'number',
  },
];

const deStructureEqlOptions = (eqlOptions?: EqlOptionsSelected) => ({
  ...(!isEmpty(eqlOptions?.eventCategoryField)
    ? {
        eventCategoryField: eqlOptions?.eventCategoryField,
      }
    : {}),
  ...(!isEmpty(eqlOptions?.size)
    ? {
        size: eqlOptions?.size,
      }
    : {}),
  ...(!isEmpty(eqlOptions?.tiebreakerField)
    ? {
        tiebreakerField: eqlOptions?.tiebreakerField,
      }
    : {}),
  ...(!isEmpty(eqlOptions?.timestampField)
    ? {
        timestampField: eqlOptions?.timestampField,
      }
    : {}),
});

export const useTimelineEvents = ({
  dataViewId,
  docValueFields,
  endDate,
  eqlOptions = undefined,
  id = ID,
  indexNames,
  fields,
  filterQuery,
  runtimeMappings,
  startDate,
  language = 'kuery',
  limit,
  sort = initSortDefault,
  skip = false,
  timerangeKind,
}: UseTimelineEventsProps): [boolean, TimelineArgs] => {
  const [{ pageName }] = useRouteSpy();
  const dispatch = useDispatch();
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState(
    id === TimelineId.active ? activeTimeline.getActivePage() : 0
  );
  const [timelineRequest, setTimelineRequest] = useState<TimelineRequest<typeof language> | null>(
    null
  );
  const prevTimelineRequest = useRef<TimelineRequest<typeof language> | null>(null);

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
        activeTimeline.setExpandedDetail({});
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

  const setUpdated = useCallback(
    (updatedAt: number) => {
      dispatch(timelineActions.setTimelineUpdatedAt({ id, updated: updatedAt }));
    },
    [dispatch, id]
  );

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
  const { addWarning } = useAppToasts();

  const timelineSearch = useCallback(
    (request: TimelineRequest<typeof language> | null) => {
      if (request == null || pageName === '' || skip) {
        return;
      }

      const asyncSearch = async () => {
        prevTimelineRequest.current = request;
        abortCtrl.current = new AbortController();
        setLoading(true);
        searchSubscription$.current = data.search
          .search<TimelineRequest<typeof language>, TimelineResponse<typeof language>>(request, {
            strategy:
              request.language === 'eql' ? 'timelineEqlSearchStrategy' : 'timelineSearchStrategy',
            abortSignal: abortCtrl.current.signal,
            // we only need the id to throw better errors
            indexPattern: { id: dataViewId } as unknown as DataView,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
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
                  setUpdated(newTimelineResponse.updatedAt);
                  if (id === TimelineId.active) {
                    activeTimeline.setExpandedDetail({});
                    activeTimeline.setPageName(pageName);
                    if (request.language === 'eql') {
                      activeTimeline.setEqlRequest(request as TimelineEqlRequestOptions);
                      activeTimeline.setEqlResponse(newTimelineResponse);
                    } else {
                      // @ts-expect-error EqlSearchRequest.query is not compatible with QueryDslQueryContainer
                      activeTimeline.setRequest(request);
                      activeTimeline.setResponse(newTimelineResponse);
                    }
                  }
                  return newTimelineResponse;
                });
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_TIMELINE_EVENTS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              data.search.showError(msg);
              searchSubscription$.current.unsubscribe();
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

        if (request.language === 'eql') {
          prevTimelineRequest.current = activeTimeline.getEqlRequest();
          refetch.current = asyncSearch.bind(null, activeTimeline.getEqlRequest());
        } else {
          prevTimelineRequest.current = activeTimeline.getRequest();
          refetch.current = asyncSearch.bind(null, activeTimeline.getRequest());
        }

        setTimelineResponse((prevResp) => {
          const resp =
            request.language === 'eql'
              ? activeTimeline.getEqlResponse()
              : activeTimeline.getResponse();
          if (resp != null) {
            return {
              ...resp,
              refetch: refetchGrid,
              loadPage: wrappedLoadPage,
            };
          }
          return prevResp;
        });
        if (request.language !== 'eql' && activeTimeline.getResponse() != null) {
          return;
        } else if (request.language === 'eql' && activeTimeline.getEqlResponse() != null) {
          return;
        }
      }

      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [
      pageName,
      skip,
      id,
      data.search,
      dataViewId,
      setUpdated,
      addWarning,
      refetchGrid,
      wrappedLoadPage,
    ]
  );

  useEffect(() => {
    if (skipQueryForDetectionsPage(id, indexNames) || indexNames.length === 0) {
      return;
    }

    setTimelineRequest((prevRequest) => {
      const prevEqlRequest = prevRequest as TimelineEqlRequestOptions;
      const prevSearchParameters = {
        defaultIndex: prevRequest?.defaultIndex ?? [],
        filterQuery: prevRequest?.filterQuery ?? '',
        querySize: prevRequest?.pagination.querySize ?? 0,
        sort: prevRequest?.sort ?? initSortDefault,
        timerange: prevRequest?.timerange ?? {},
        runtimeMappings: prevRequest?.runtimeMappings ?? {},
        ...deStructureEqlOptions(prevEqlRequest),
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
        runtimeMappings,
        ...deStructureEqlOptions(eqlOptions),
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
        language,
        runtimeMappings,
        sort,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        ...(eqlOptions ? eqlOptions : {}),
      };

      if (activePage !== newActivePage) {
        setActivePage(newActivePage);
        if (id === TimelineId.active) {
          activeTimeline.setActivePage(newActivePage);
        }
      }
      if (!skipQueryForDetectionsPage(id, indexNames) && !deepEqual(prevRequest, currentRequest)) {
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
    eqlOptions,
    filterQuery,
    id,
    language,
    limit,
    startDate,
    sort,
    fields,
    runtimeMappings,
  ]);

  useEffect(() => {
    if (
      id !== TimelineId.active ||
      timerangeKind === 'absolute' ||
      !deepEqual(prevTimelineRequest.current, timelineRequest)
    ) {
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
