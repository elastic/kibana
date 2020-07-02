/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { useCallback, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { OpenTimelineResult } from '../../components/open_timeline/types';
import { errorToToaster, useStateToaster } from '../../../common/components/toasters';
import {
  GetAllTimeline,
  PageInfoTimeline,
  SortTimeline,
  TimelineResult,
} from '../../../graphql/types';
import { inputsActions } from '../../../common/store/inputs';
import { useApolloClient } from '../../../common/utils/apollo_context';

import { allTimelinesQuery } from './index.gql_query';
import * as i18n from '../../pages/translations';
import {
  TimelineTypeLiteralWithNull,
  TimelineStatusLiteralWithNull,
  TemplateTimelineTypeLiteralWithNull,
} from '../../../../common/types/timeline';

export interface AllTimelinesArgs {
  fetchAllTimeline: ({
    onlyUserFavorite,
    pageInfo,
    search,
    sort,
    status,
    timelineType,
  }: AllTimelinesVariables) => void;
  timelines: OpenTimelineResult[];
  loading: boolean;
  totalCount: number;
  customTemplateTimelineCount: number;
  defaultTimelineCount: number;
  elasticTemplateTimelineCount: number;
  templateTimelineCount: number;
  favoriteCount: number;
}

export interface AllTimelinesVariables {
  onlyUserFavorite: boolean;
  pageInfo: PageInfoTimeline;
  search: string;
  sort: SortTimeline;
  status: TimelineStatusLiteralWithNull;
  timelineType: TimelineTypeLiteralWithNull;
  templateTimelineType: TemplateTimelineTypeLiteralWithNull;
}

export const ALL_TIMELINE_QUERY_ID = 'FETCH_ALL_TIMELINES';

export const getAllTimeline = memoizeOne(
  (_variables: string, timelines: TimelineResult[]): OpenTimelineResult[] =>
    timelines.map((timeline) => ({
      created: timeline.created,
      description: timeline.description,
      eventIdToNoteIds:
        timeline.eventIdToNoteIds != null
          ? timeline.eventIdToNoteIds.reduce((acc, note) => {
              if (note.eventId != null) {
                const notes = getOr([], note.eventId, acc);
                return { ...acc, [note.eventId]: [...notes, note.noteId] };
              }
              return acc;
            }, {})
          : null,
      favorite: timeline.favorite,
      noteIds: timeline.noteIds,
      notes:
        timeline.notes != null
          ? timeline.notes.map((note) => ({ ...note, savedObjectId: note.noteId }))
          : null,
      pinnedEventIds:
        timeline.pinnedEventIds != null
          ? timeline.pinnedEventIds.reduce(
              (acc, pinnedEventId) => ({ ...acc, [pinnedEventId]: true }),
              {}
            )
          : null,
      savedObjectId: timeline.savedObjectId,
      status: timeline.status,
      title: timeline.title,
      updated: timeline.updated,
      updatedBy: timeline.updatedBy,
    }))
);

export const useGetAllTimeline = (): AllTimelinesArgs => {
  const dispatch = useDispatch();
  const apolloClient = useApolloClient();
  const [, dispatchToaster] = useStateToaster();
  const [allTimelines, setAllTimelines] = useState<Omit<AllTimelinesArgs, 'fetchAllTimeline'>>({
    loading: false,
    totalCount: 0,
    timelines: [],
    customTemplateTimelineCount: 0,
    defaultTimelineCount: 0,
    elasticTemplateTimelineCount: 0,
    templateTimelineCount: 0,
    favoriteCount: 0,
  });

  const fetchAllTimeline = useCallback(
    async ({
      onlyUserFavorite,
      pageInfo,
      search,
      sort,
      status,
      timelineType,
      templateTimelineType,
    }: AllTimelinesVariables) => {
      let didCancel = false;
      const abortCtrl = new AbortController();

      const fetchData = async () => {
        try {
          if (apolloClient != null) {
            setAllTimelines((prevState) => ({ ...prevState, loading: true }));

            const variables: GetAllTimeline.Variables = {
              onlyUserFavorite,
              pageInfo,
              search,
              sort,
              status,
              timelineType,
              templateTimelineType,
            };
            const response = await apolloClient.query<
              GetAllTimeline.Query,
              GetAllTimeline.Variables
            >({
              query: allTimelinesQuery,
              fetchPolicy: 'network-only',
              variables,
              context: {
                fetchOptions: {
                  abortSignal: abortCtrl.signal,
                },
              },
            });
            const getAllTimelineResponse = response?.data?.getAllTimeline;
            const totalCount = getAllTimelineResponse?.totalCount ?? 0;
            const timelines = getAllTimelineResponse?.timeline ?? [];
            const customTemplateTimelineCount =
              getAllTimelineResponse?.customTemplateTimelineCount ?? 0;
            const defaultTimelineCount = getAllTimelineResponse?.defaultTimelineCount ?? 0;
            const elasticTemplateTimelineCount =
              getAllTimelineResponse?.elasticTemplateTimelineCount ?? 0;
            const templateTimelineCount = getAllTimelineResponse?.templateTimelineCount ?? 0;
            const favoriteCount = getAllTimelineResponse?.favoriteCount ?? 0;
            if (!didCancel) {
              dispatch(
                inputsActions.setQuery({
                  inputId: 'global',
                  id: ALL_TIMELINE_QUERY_ID,
                  loading: false,
                  refetch: fetchData,
                  inspect: null,
                })
              );
              setAllTimelines({
                loading: false,
                totalCount,
                timelines: getAllTimeline(JSON.stringify(variables), timelines as TimelineResult[]),
                customTemplateTimelineCount,
                defaultTimelineCount,
                elasticTemplateTimelineCount,
                templateTimelineCount,
                favoriteCount,
              });
            }
          }
        } catch (error) {
          if (!didCancel) {
            errorToToaster({
              title: i18n.ERROR_FETCHING_TIMELINES_TITLE,
              error: error.body && error.body.message ? new Error(error.body.message) : error,
              dispatchToaster,
            });
            setAllTimelines({
              loading: false,
              totalCount: 0,
              timelines: [],
              customTemplateTimelineCount: 0,
              defaultTimelineCount: 0,
              elasticTemplateTimelineCount: 0,
              templateTimelineCount: 0,
              favoriteCount: 0,
            });
          }
        }
      };
      fetchData();
      return () => {
        didCancel = true;
        abortCtrl.abort();
      };
    },
    [apolloClient, dispatch, dispatchToaster]
  );

  useEffect(() => {
    return () => {
      dispatch(inputsActions.deleteOneQuery({ inputId: 'global', id: ALL_TIMELINE_QUERY_ID }));
    };
  }, [dispatch]);

  return {
    ...allTimelines,
    fetchAllTimeline,
  };
};
