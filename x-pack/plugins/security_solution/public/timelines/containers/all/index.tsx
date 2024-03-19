/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { useCallback, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { getTimelineQueryTypes } from '../helpers';
import { InputsModelId } from '../../../common/store/inputs/constants';
import type { OpenTimelineResult } from '../../components/open_timeline/types';
import { errorToToaster, useStateToaster } from '../../../common/components/toasters';
import { inputsActions } from '../../../common/store/inputs';

import * as i18n from '../../pages/translations';
import type {
  TimelineTypeLiteralWithNull,
  TimelineStatusLiteralWithNull,
  PageInfoTimeline,
  TimelineResult,
  SortTimeline,
  GetAllTimelineVariables,
} from '../../../../common/api/timeline';
import { TimelineType } from '../../../../common/api/timeline';
import { getAllTimelines } from '../api';

export interface AllTimelinesArgs {
  fetchAllTimeline: ({
    onlyUserFavorite,
    pageInfo,
    search,
    sort,
    status,
    timelineType,
  }: AllTimelinesVariables) => void;
  timelines: OpenTimelineResult[] | null;
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
      excludedRowRendererIds: timeline.excludedRowRendererIds,
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
      savedSearchId: timeline.savedSearchId,
      status: timeline.status,
      title: timeline.title,
      updated: timeline.updated,
      updatedBy: timeline.updatedBy,
      timelineType: timeline.timelineType ?? TimelineType.default,
      templateTimelineId: timeline.templateTimelineId,
      queryType: getTimelineQueryTypes(timeline),
    }))
);

export const useGetAllTimeline = (): AllTimelinesArgs => {
  const dispatch = useDispatch();
  const [, dispatchToaster] = useStateToaster();
  const [allTimelines, setAllTimelines] = useState<Omit<AllTimelinesArgs, 'fetchAllTimeline'>>({
    loading: false,
    totalCount: 0,
    timelines: null, // use null as initial state to distinguish between empty result and haven't started loading.
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
    }: AllTimelinesVariables) => {
      let didCancel = false;
      const abortCtrl = new AbortController();

      const fetchData = async () => {
        try {
          setAllTimelines((prevState) => ({
            ...prevState,
            loading: true,
          }));

          const variables: GetAllTimelineVariables = {
            onlyUserFavorite,
            pageInfo,
            search,
            sort,
            status,
            timelineType,
          };
          const getAllTimelineResponse = await getAllTimelines(variables, abortCtrl.signal);
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
                inputId: InputsModelId.global,
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
    [dispatch, dispatchToaster]
  );

  useEffect(
    () => () => {
      dispatch(
        inputsActions.deleteOneQuery({ inputId: InputsModelId.global, id: ALL_TIMELINE_QUERY_ID })
      );
    },
    [dispatch]
  );

  return {
    ...allTimelines,
    fetchAllTimeline,
  };
};
