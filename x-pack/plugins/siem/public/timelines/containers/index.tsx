/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ApolloQueryResult } from 'apollo-client';
import memoizeOne from 'memoize-one';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { IIndexPattern } from '../../../../../../src/plugins/data/common/index_patterns';
import { GetTimelineQuery, PageInfo, SortField, TimelineItem } from '../../graphql/types';
import { inputsModel, inputsSelectors, State } from '../../common/store';
import { WithKibanaProps } from '../../common/lib/kibana';
import { createFilter } from '../../common/containers/helpers';
import { QueryTemplateProps } from '../../common/containers/query_template';
import { EventType } from '../../timelines/store/timeline/model';
import { timelineQuery } from './index.gql_query';
import { timelineActions } from '../../timelines/store/timeline';
import { SIGNALS_PAGE_TIMELINE_ID } from '../../alerts/components/signals';
import { useApolloClient } from '../../common/utils/apollo_context';
import { useStateToaster, errorToToaster } from '../../common/components/toasters';

export interface TimelineArgs {
  events: TimelineItem[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  loadMore: (cursor: string, tieBreaker: string) => void;
  pageInfo: PageInfo;
  refetch: inputsModel.Refetch;
  totalCount: number;
  getUpdatedAt: () => number;
}

export interface OwnProps extends QueryTemplateProps {
  eventType?: EventType;
  id: string;
  indexPattern?: IIndexPattern;
  indexToAdd?: string[];
  limit: number;
  sortField: SortField;
  fields: string[];
}

type TimelineQueryProps = OwnProps & WithKibanaProps;

const defaultInspectObj = { dsl: [], response: [] };

const getTimelineEvents = memoizeOne(
  (
    variables: string,
    timelineEdges: GetTimelineQuery.Edges[],
    paginatedAction: boolean = false,
    events: TimelineItem[]
  ): TimelineItem[] => {
    const eventsFromEdges = timelineEdges.map(
      (e: GetTimelineQuery.Edges) => e.node as TimelineItem
    );
    if (paginatedAction) {
      return [...events, ...eventsFromEdges];
    }
    return eventsFromEdges;
  }
);

export const useTimelineQuery = ({
  eventType = 'raw',
  id,
  indexPattern,
  indexToAdd = [],
  kibana,
  limit,
  fields,
  filterQuery,
  sourceId,
  sortField,
}: TimelineQueryProps): TimelineArgs => {
  const getQuery = inputsSelectors.timelineQueryByIdSelector();
  const { isInspected } = useSelector((state: State) => getQuery(state, id));
  const dispatch = useDispatch();
  const apolloClient = useApolloClient();
  const [, dispatchToaster] = useStateToaster();
  const updatedAt = useRef(Date.now());

  const getUpdatedAt = useCallback(() => updatedAt.current, [updatedAt.current]);

  const [response, setResponse] = useState<
    Pick<
      TimelineArgs,
      'events' | 'id' | 'inspect' | 'loading' | 'pageInfo' | 'totalCount' | 'getUpdatedAt'
    >
  >({
    events: [],
    id,
    inspect: defaultInspectObj,
    loading: false,
    pageInfo: {},
    totalCount: 0,
    getUpdatedAt,
  });

  const defaultKibanaIndex = kibana.services.uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const defaultIndex = useMemo(
    () =>
      indexPattern == null || (indexPattern != null && indexPattern.title === '')
        ? [
            ...(['all', 'raw'].includes(eventType) ? defaultKibanaIndex : []),
            ...(['all', 'signal'].includes(eventType) ? indexToAdd : []),
          ]
        : indexPattern?.title.split(',') ?? [],
    [indexPattern, defaultKibanaIndex, eventType, indexToAdd]
  );
  const variablesMemo = useMemo<
    Pick<
      GetTimelineQuery.Variables,
      'fieldRequested' | 'filterQuery' | 'sourceId' | 'sortField' | 'defaultIndex' | 'inspect'
    >
  >(
    () => ({
      fieldRequested: fields,
      filterQuery: createFilter(filterQuery),
      sourceId,
      sortField,
      defaultIndex,
      inspect: isInspected,
    }),
    [defaultIndex, fields, filterQuery, sourceId, sortField, isInspected]
  );

  const updateResponseEvents = useCallback(
    ({
      resp,
      didCancel,
      paginatedAction = false,
      variables,
    }: {
      resp: ApolloQueryResult<GetTimelineQuery.Query> | undefined;
      didCancel: boolean;
      variables: GetTimelineQuery.Variables;
      paginatedAction?: boolean;
    }) => {
      const timelineEdges = resp?.data?.source.Timeline.edges ?? [];
      if (!didCancel) {
        updatedAt.current = Date.now();
        setResponse({
          id,
          inspect: resp?.data?.source.Timeline.inspect ?? defaultInspectObj,
          loading: false,
          totalCount: resp?.data?.source.Timeline.totalCount ?? 0,
          pageInfo: resp?.data?.source.Timeline.pageInfo ?? {},
          events: getTimelineEvents(
            JSON.stringify(variables),
            timelineEdges,
            paginatedAction,
            response.events
          ),
          getUpdatedAt,
        });
      }
    },
    [response, limit]
  );

  const requestEvents = useCallback(
    async (
      cursor: string | null = null,
      tiebreaker: string | null = null,
      variables: GetTimelineQuery.Variables,
      abortCtrl: AbortController
    ) => {
      const fetch = async () =>
        apolloClient?.query<GetTimelineQuery.Query, GetTimelineQuery.Variables>({
          query: timelineQuery,
          fetchPolicy: 'network-only',
          variables,
          context: {
            fetchOptions: {
              abortSignal: abortCtrl.signal,
            },
          },
        });
      return fetch();
    },
    [apolloClient, limit]
  );

  const getEvents = useCallback(
    async (cursor?: string, tiebreaker?: string) => {
      let didCancel = false;
      const abortCtrl = new AbortController();

      try {
        setResponse({
          ...response,
          loading: true,
        });
        const variables = {
          ...variablesMemo,
          pagination: { limit, cursor, tiebreaker },
        };
        const resp = await requestEvents(cursor, tiebreaker, variables, abortCtrl);
        updateResponseEvents({ resp, didCancel, paginatedAction: !isEmpty(cursor), variables });
      } catch (error) {
        if (!didCancel) {
          errorToToaster({
            title: 'ERROR',
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          setResponse({
            ...response,
            loading: false,
            totalCount: 0,
            events: [],
          });
        }
      }

      return () => {
        didCancel = true;
        abortCtrl.abort();
      };
    },
    [requestEvents, updateResponseEvents, response, variablesMemo, limit]
  );

  const clearSignalsState = useCallback(() => {
    if (id != null && id === SIGNALS_PAGE_TIMELINE_ID) {
      dispatch(timelineActions.clearEventsLoading({ id }));
      dispatch(timelineActions.clearEventsDeleted({ id }));
    }
  }, [id]);

  const refetch = useCallback(() => {
    clearSignalsState();
    getEvents();
  }, [getEvents, clearSignalsState]);

  const loadMore = useCallback(
    async (cursor: string, tiebreaker?: string) => {
      clearSignalsState();
      getEvents(cursor, tiebreaker);
    },
    [getEvents, clearSignalsState]
  );

  useEffect(() => {
    // T
    getEvents();
  }, [variablesMemo, limit]);

  return {
    ...response,
    refetch,
    loadMore,
  };
};
