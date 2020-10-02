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
import { generateTablePaginationOptions } from '../../common/components/paginated_table/helpers';
import { timelineActions } from '../../timelines/store/timeline';
import { detectionsTimelineIds, skipQueryForDetectionsPage } from './helpers';
import { getInspectResponse } from '../../helpers';
import {
  Direction,
  PageInfoPaginated,
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
  pageInfo: PageInfoPaginated;
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

export const useTimelineEvents = ({
  docValueFields,
  endDate,
  id = ID,
  indexNames,
  fields,
  filterQuery,
  startDate,
  limit,
  sort = {
    field: '@timestamp',
    direction: Direction.asc,
  },
  skip = false,
}: UseTimelineEventsProps): [boolean, TimelineArgs] => {
  const dispatch = useDispatch();
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [timelineRequest, setTimelineRequest] = useState<TimelineEventsAllRequestOptions | null>(
    !skip
      ? {
          fields,
          fieldRequested: fields,
          filterQuery: createFilter(filterQuery),
          id,
          timerange: {
            interval: '12h',
            from: startDate,
            to: endDate,
          },
          pagination: generateTablePaginationOptions(activePage, limit),
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
      fakeTotalCount: 0,
      showMorePagesIndicator: false,
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
    [data.search, notifications.toasts]
  );

  useEffect(() => {
    if (skip || skipQueryForDetectionsPage(id, indexNames) || indexNames.length === 0) {
      return;
    }

    setTimelineRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {
          fields,
          fieldRequested: fields,
          id,
          factoryQueryType: TimelineEventsQueries.all,
        }),
        defaultIndex: indexNames,
        docValueFields: docValueFields ?? [],
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        sort,
      };
      if (
        !skip &&
        !skipQueryForDetectionsPage(id, indexNames) &&
        !deepEqual(prevRequest, myRequest)
      ) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [
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
