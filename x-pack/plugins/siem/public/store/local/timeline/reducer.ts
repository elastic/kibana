/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  addHistory,
  addNote,
  addNoteToEvent,
  addProvider,
  applyDeltaToColumnWidth,
  applyDeltaToWidth,
  applyKqlFilterQuery,
  createTimeline,
  pinEvent,
  removeColumn,
  removeProvider,
  setKqlFilterQueryDraft,
  showTimeline,
  unPinEvent,
  updateColumns,
  updateDataProviderEnabled,
  updateDataProviderExcluded,
  updateDataProviderKqlQuery,
  updateDescription,
  updateHighlightedDropAndProviderId,
  updateIsFavorite,
  updateIsLive,
  updateItemsPerPage,
  updateItemsPerPageOptions,
  updateKqlMode,
  updatePageIndex,
  updateProviders,
  updateRange,
  updateSort,
  updateTitle,
} from './actions';
import {
  addNewTimeline,
  addTimelineHistory,
  addTimelineNote,
  addTimelineNoteToEvent,
  addTimelineProvider,
  applyDeltaToCurrentWidth,
  applyDeltaToTimelineColumnWidth,
  applyKqlFilterQueryDraft,
  pinTimelineEvent,
  removeTimelineColumn,
  removeTimelineProvider,
  unPinTimelineEvent,
  updateHighlightedDropAndProvider,
  updateKqlFilterQueryDraft,
  updateTimelineColumns,
  updateTimelineDescription,
  updateTimelineIsFavorite,
  updateTimelineIsLive,
  updateTimelineItemsPerPage,
  updateTimelineKqlMode,
  updateTimelinePageIndex,
  updateTimelinePerPageOptions,
  updateTimelineProviderEnabled,
  updateTimelineProviderExcluded,
  updateTimelineProviderKqlQuery,
  updateTimelineProviders,
  updateTimelineRange,
  updateTimelineShowTimeline,
  updateTimelineSort,
  updateTimelineTitle,
} from './helpers';
import { TimelineModel } from './model';

/** A map of id to timeline  */
export interface TimelineById {
  [id: string]: TimelineModel;
}

/** The state of all timelines is stored here */
export interface TimelineState {
  timelineById: TimelineById;
}

const EMPTY_TIMELINE_BY_ID: TimelineById = {}; // stable reference

export const initialTimelineState: TimelineState = {
  timelineById: EMPTY_TIMELINE_BY_ID,
};

/** The reducer for all timeline actions  */
export const timelineReducer = reducerWithInitialState(initialTimelineState)
  .case(createTimeline, (state, { id, show, columns }) => ({
    ...state,
    timelineById: addNewTimeline({ id, columns, show, timelineById: state.timelineById }),
  }))
  .case(addHistory, (state, { id, historyId }) => ({
    ...state,
    timelineById: addTimelineHistory({ id, historyId, timelineById: state.timelineById }),
  }))
  .case(addNote, (state, { id, noteId }) => ({
    ...state,
    timelineById: addTimelineNote({ id, noteId, timelineById: state.timelineById }),
  }))
  .case(addNoteToEvent, (state, { id, noteId, eventId }) => ({
    ...state,
    timelineById: addTimelineNoteToEvent({ id, noteId, eventId, timelineById: state.timelineById }),
  }))
  .case(addProvider, (state, { id, provider }) => ({
    ...state,
    timelineById: addTimelineProvider({ id, provider, timelineById: state.timelineById }),
  }))
  .case(applyKqlFilterQuery, (state, { id, filterQuery }) => ({
    ...state,
    timelineById: applyKqlFilterQueryDraft({ id, filterQuery, timelineById: state.timelineById }),
  }))
  .case(setKqlFilterQueryDraft, (state, { id, filterQueryDraft }) => ({
    ...state,
    timelineById: updateKqlFilterQueryDraft({
      id,
      filterQueryDraft,
      timelineById: state.timelineById,
    }),
  }))
  .case(showTimeline, (state, { id, show }) => ({
    ...state,
    timelineById: updateTimelineShowTimeline({ id, show, timelineById: state.timelineById }),
  }))
  .case(applyDeltaToColumnWidth, (state, { id, columnId, delta }) => ({
    ...state,
    timelineById: applyDeltaToTimelineColumnWidth({
      id,
      columnId,
      delta,
      timelineById: state.timelineById,
    }),
  }))
  .case(
    applyDeltaToWidth,
    (state, { id, delta, bodyClientWidthPixels, minWidthPixels, maxWidthPercent }) => ({
      ...state,
      timelineById: applyDeltaToCurrentWidth({
        id,
        delta,
        bodyClientWidthPixels,
        minWidthPixels,
        maxWidthPercent,
        timelineById: state.timelineById,
      }),
    })
  )
  .case(pinEvent, (state, { id, eventId }) => ({
    ...state,
    timelineById: pinTimelineEvent({ id, eventId, timelineById: state.timelineById }),
  }))
  .case(removeColumn, (state, { id, columnId }) => ({
    ...state,
    timelineById: removeTimelineColumn({
      id,
      columnId,
      timelineById: state.timelineById,
    }),
  }))
  .case(removeProvider, (state, { id, providerId, andProviderId }) => ({
    ...state,
    timelineById: removeTimelineProvider({
      id,
      providerId,
      timelineById: state.timelineById,
      andProviderId,
    }),
  }))
  .case(unPinEvent, (state, { id, eventId }) => ({
    ...state,
    timelineById: unPinTimelineEvent({ id, eventId, timelineById: state.timelineById }),
  }))
  .case(updateColumns, (state, { id, columns }) => ({
    ...state,
    timelineById: updateTimelineColumns({ id, columns, timelineById: state.timelineById }),
  }))
  .case(updateDescription, (state, { id, description }) => ({
    ...state,
    timelineById: updateTimelineDescription({ id, description, timelineById: state.timelineById }),
  }))
  .case(updateIsFavorite, (state, { id, isFavorite }) => ({
    ...state,
    timelineById: updateTimelineIsFavorite({ id, isFavorite, timelineById: state.timelineById }),
  }))
  .case(updateIsLive, (state, { id, isLive }) => ({
    ...state,
    timelineById: updateTimelineIsLive({ id, isLive, timelineById: state.timelineById }),
  }))
  .case(updateKqlMode, (state, { id, kqlMode }) => ({
    ...state,
    timelineById: updateTimelineKqlMode({ id, kqlMode, timelineById: state.timelineById }),
  }))
  .case(updateTitle, (state, { id, title }) => ({
    ...state,
    timelineById: updateTimelineTitle({ id, title, timelineById: state.timelineById }),
  }))
  .case(updateProviders, (state, { id, providers }) => ({
    ...state,
    timelineById: updateTimelineProviders({ id, providers, timelineById: state.timelineById }),
  }))
  .case(updateRange, (state, { id, range }) => ({
    ...state,
    timelineById: updateTimelineRange({ id, range, timelineById: state.timelineById }),
  }))
  .case(updateSort, (state, { id, sort }) => ({
    ...state,
    timelineById: updateTimelineSort({ id, sort, timelineById: state.timelineById }),
  }))
  .case(updateDataProviderEnabled, (state, { id, enabled, providerId, andProviderId }) => ({
    ...state,
    timelineById: updateTimelineProviderEnabled({
      id,
      enabled,
      providerId,
      timelineById: state.timelineById,
      andProviderId,
    }),
  }))
  .case(updateDataProviderExcluded, (state, { id, excluded, providerId, andProviderId }) => ({
    ...state,
    timelineById: updateTimelineProviderExcluded({
      id,
      excluded,
      providerId,
      timelineById: state.timelineById,
      andProviderId,
    }),
  }))
  .case(updateDataProviderKqlQuery, (state, { id, kqlQuery, providerId }) => ({
    ...state,
    timelineById: updateTimelineProviderKqlQuery({
      id,
      kqlQuery,
      providerId,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateItemsPerPage, (state, { id, itemsPerPage }) => ({
    ...state,
    timelineById: updateTimelineItemsPerPage({
      id,
      itemsPerPage,
      timelineById: state.timelineById,
    }),
  }))
  .case(updatePageIndex, (state, { id, activePage }) => ({
    ...state,
    timelineById: updateTimelinePageIndex({
      id,
      activePage,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateItemsPerPageOptions, (state, { id, itemsPerPageOptions }) => ({
    ...state,
    timelineById: updateTimelinePerPageOptions({
      id,
      itemsPerPageOptions,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateHighlightedDropAndProviderId, (state, { id, providerId }) => ({
    ...state,
    timelineById: updateHighlightedDropAndProvider({
      id,
      providerId,
      timelineById: state.timelineById,
    }),
  }))
  .build();
