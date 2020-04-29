/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, noop } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { useCallback, useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { OpenTimelineResult } from '../../../components/open_timeline/types';
import { errorToToaster, useStateToaster } from '../../../components/toasters';
import {
  GetAllTimeline,
  PageInfoTimeline,
  SortTimeline,
  TimelineResult,
} from '../../../graphql/types';
import { inputsModel, inputsActions } from '../../../store/inputs';
import { useApolloClient } from '../../../utils/apollo_context';

import { allTimelinesQuery } from './index.gql_query';
import * as i18n from '../../../pages/timelines/translations';

export interface AllTimelinesArgs {
  fetchAllTimeline: ({ onlyUserFavorite, pageInfo, search, sort }: AllTimelinesVariables) => void;
  timelines: OpenTimelineResult[];
  loading: boolean;
  totalCount: number;
  refetch: () => void;
}

export interface AllTimelinesVariables {
  onlyUserFavorite: boolean;
  pageInfo: PageInfoTimeline;
  search: string;
  sort: SortTimeline;
  timelines: OpenTimelineResult[];
  totalCount: number;
}

export const ALL_TIMELINE_QUERY_ID = 'FETCH_ALL_TIMELINES';

export const getAllTimeline = memoizeOne(
  (variables: string, timelines: TimelineResult[]): OpenTimelineResult[] =>
    timelines.map(timeline => ({
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
          ? timeline.notes.map(note => ({ ...note, savedObjectId: note.noteId }))
          : null,
      pinnedEventIds:
        timeline.pinnedEventIds != null
          ? timeline.pinnedEventIds.reduce(
              (acc, pinnedEventId) => ({ ...acc, [pinnedEventId]: true }),
              {}
            )
          : null,
      savedObjectId: timeline.savedObjectId,
      title: timeline.title,
      updated: timeline.updated,
      updatedBy: timeline.updatedBy,
    }))
);

export const useGetAllTimeline = (): AllTimelinesArgs => {
  const dispatch = useDispatch();
  const apolloClient = useApolloClient();
  const refetch = useRef<inputsModel.Refetch>();
  const [, dispatchToaster] = useStateToaster();
  const [allTimelines, setAllTimelines] = useState<AllTimelinesArgs>({
    fetchAllTimeline: noop,
    loading: false,
    refetch: refetch.current ?? noop,
    totalCount: 0,
    timelines: [],
  });

  const fetchAllTimeline = useCallback(
    async ({
      onlyUserFavorite,
      pageInfo,
      search,
      sort,
      timelines,
      totalCount,
    }: AllTimelinesVariables) => {
      let didCancel = false;
      const abortCtrl = new AbortController();

      const fetchData = async () => {
        try {
          if (apolloClient != null) {
            setAllTimelines({
              ...allTimelines,
              timelines: timelines ?? allTimelines.timelines,
              totalCount: totalCount ?? allTimelines.totalCount,
              loading: true,
            });
            const variables: GetAllTimeline.Variables = {
              onlyUserFavorite,
              pageInfo,
              search,
              sort,
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
            if (!didCancel) {
              dispatch(
                inputsActions.setQuery({
                  inputId: 'global',
                  id: ALL_TIMELINE_QUERY_ID,
                  loading: false,
                  refetch: refetch.current ?? noop,
                  inspect: null,
                })
              );
              setAllTimelines({
                fetchAllTimeline,
                loading: false,
                refetch: refetch.current ?? noop,
                totalCount: getOr(0, 'getAllTimeline.totalCount', response.data),
                timelines: getAllTimeline(
                  JSON.stringify(variables),
                  getOr([], 'getAllTimeline.timeline', response.data)
                ),
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
              fetchAllTimeline,
              loading: false,
              refetch: noop,
              totalCount: 0,
              timelines: [],
            });
          }
        }
      };
      refetch.current = fetchData;
      fetchData();
      return () => {
        didCancel = true;
        abortCtrl.abort();
      };
    },
    [apolloClient, allTimelines]
  );

  useEffect(() => {
    return () => {
      dispatch(inputsActions.deleteOneQuery({ inputId: 'global', id: ALL_TIMELINE_QUERY_ID }));
    };
  }, [dispatch]);

  return {
    ...allTimelines,
    fetchAllTimeline,
    refetch: refetch.current ?? noop,
  };
};
