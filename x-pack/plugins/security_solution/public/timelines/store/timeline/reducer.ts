/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  addHistory,
  addNote,
  addNoteToEvent,
  addProvider,
  addTimeline,
  applyKqlFilterQuery,
  createTimeline,
  dataProviderEdited,
  endTimelineSaving,
  pinEvent,
  removeProvider,
  setActiveTabTimeline,
  setExcludedRowRendererIds,
  setFilters,
  setInsertTimeline,
  setSavedQueryId,
  showCallOutUnauthorizedMsg,
  showTimeline,
  startTimelineSaving,
  unPinEvent,
  updateAutoSaveMsg,
  updateDataProviderEnabled,
  updateDataProviderExcluded,
  updateDataProviderKqlQuery,
  updateDataProviderType,
  updateEventType,
  updateDataView,
  updateIsFavorite,
  updateIsLive,
  updateKqlMode,
  updatePageIndex,
  updateProviders,
  updateRange,
  updateTimeline,
  updateTimelineGraphEventId,
  updateTitleAndDescription,
  updateTimelineSessionViewEventId,
  updateTimelineSessionViewSessionId,
  toggleModalSaveTimeline,
  updateEqlOptions,
  setTimelineUpdatedAt,
} from './actions';
import {
  addNewTimeline,
  addTimelineHistory,
  addTimelineNote,
  addTimelineNoteToEvent,
  addTimelineProvider,
  addTimelineToStore,
  applyKqlFilterQueryDraft,
  pinTimelineEvent,
  removeTimelineProvider,
  unPinTimelineEvent,
  updateExcludedRowRenderersIds,
  updateTimelineIsFavorite,
  updateTimelineIsLive,
  updateTimelineKqlMode,
  updateTimelinePageIndex,
  updateTimelineProviderEnabled,
  updateTimelineProviderExcluded,
  updateTimelineProviderProperties,
  updateTimelineProviderKqlQuery,
  updateTimelineProviderType,
  updateTimelineProviders,
  updateTimelineRange,
  updateTimelineShowTimeline,
  updateTimelineTitleAndDescription,
  updateSavedQuery,
  updateGraphEventId,
  updateFilters,
  updateTimelineEventType,
  updateSessionViewEventId,
  updateSessionViewSessionId,
} from './helpers';

import { TimelineState, EMPTY_TIMELINE_BY_ID } from './types';
import { TimelineType } from '../../../../common/types/timeline';

export const initialTimelineState: TimelineState = {
  timelineById: EMPTY_TIMELINE_BY_ID,
  autoSavedWarningMsg: {
    timelineId: null,
    newTimelineModel: null,
  },
  showCallOutUnauthorizedMsg: false,
  insertTimeline: null,
};

/** The reducer for all timeline actions  */
export const timelineReducer = reducerWithInitialState(initialTimelineState)
  .case(addTimeline, (state, { id, timeline, resolveTimelineConfig }) => ({
    ...state,
    timelineById: addTimelineToStore({
      id,
      timeline,
      resolveTimelineConfig,
      timelineById: state.timelineById,
    }),
  }))
  .case(createTimeline, (state, { id, timelineType = TimelineType.default, ...timelineProps }) => {
    return {
      ...state,
      timelineById: addNewTimeline({
        id,
        timelineById: state.timelineById,
        timelineType,
        ...timelineProps,
      }),
    };
  })
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
    timelineById: applyKqlFilterQueryDraft({
      id,
      filterQuery,
      timelineById: state.timelineById,
    }),
  }))
  .case(showTimeline, (state, { id, show }) => ({
    ...state,
    timelineById: updateTimelineShowTimeline({ id, show, timelineById: state.timelineById }),
  }))
  .case(updateTimelineGraphEventId, (state, { id, graphEventId }) => ({
    ...state,
    timelineById: updateGraphEventId({ id, graphEventId, timelineById: state.timelineById }),
  }))
  .case(updateTimelineSessionViewEventId, (state, { id, eventId }) => ({
    ...state,
    timelineById: updateSessionViewEventId({ id, eventId, timelineById: state.timelineById }),
  }))
  .case(updateTimelineSessionViewSessionId, (state, { id, eventId }) => ({
    ...state,
    timelineById: updateSessionViewSessionId({ id, eventId, timelineById: state.timelineById }),
  }))
  .case(pinEvent, (state, { id, eventId }) => ({
    ...state,
    timelineById: pinTimelineEvent({ id, eventId, timelineById: state.timelineById }),
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
  .case(startTimelineSaving, (state, { id }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        isSaving: true,
      },
    },
  }))
  .case(endTimelineSaving, (state, { id }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        isSaving: false,
      },
    },
  }))
  .case(setExcludedRowRendererIds, (state, { id, excludedRowRendererIds }) => ({
    ...state,
    timelineById: updateExcludedRowRenderersIds({
      id,
      excludedRowRendererIds,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateTimeline, (state, { id, timeline }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: timeline,
    },
  }))
  .case(unPinEvent, (state, { id, eventId }) => ({
    ...state,
    timelineById: unPinTimelineEvent({ id, eventId, timelineById: state.timelineById }),
  }))
  .case(updateEventType, (state, { id, eventType }) => ({
    ...state,
    timelineById: updateTimelineEventType({ id, eventType, timelineById: state.timelineById }),
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
  .case(updateTitleAndDescription, (state, { id, title, description }) => ({
    ...state,
    timelineById: updateTimelineTitleAndDescription({
      id,
      title,
      description,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateProviders, (state, { id, providers }) => ({
    ...state,
    timelineById: updateTimelineProviders({ id, providers, timelineById: state.timelineById }),
  }))
  .case(updateRange, (state, { id, start, end }) => ({
    ...state,
    timelineById: updateTimelineRange({ id, start, end, timelineById: state.timelineById }),
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

  .case(
    dataProviderEdited,
    (state, { andProviderId, excluded, field, id, operator, providerId, value }) => ({
      ...state,
      timelineById: updateTimelineProviderProperties({
        andProviderId,
        excluded,
        field,
        id,
        operator,
        providerId,
        timelineById: state.timelineById,
        value,
      }),
    })
  )
  .case(updateDataProviderType, (state, { id, type, providerId, andProviderId }) => ({
    ...state,
    timelineById: updateTimelineProviderType({
      id,
      type,
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
  .case(updatePageIndex, (state, { id, activePage }) => ({
    ...state,
    timelineById: updateTimelinePageIndex({
      id,
      activePage,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateAutoSaveMsg, (state, { timelineId, newTimelineModel }) => ({
    ...state,
    autoSavedWarningMsg: {
      timelineId,
      newTimelineModel,
    },
  }))
  .case(showCallOutUnauthorizedMsg, (state) => ({
    ...state,
    showCallOutUnauthorizedMsg: true,
  }))
  .case(setSavedQueryId, (state, { id, savedQueryId }) => ({
    ...state,
    timelineById: updateSavedQuery({
      id,
      savedQueryId,
      timelineById: state.timelineById,
    }),
  }))
  .case(setFilters, (state, { id, filters }) => ({
    ...state,
    timelineById: updateFilters({
      id,
      filters,
      timelineById: state.timelineById,
    }),
  }))
  .case(setInsertTimeline, (state, insertTimeline) => ({
    ...state,
    insertTimeline,
  }))
  .case(updateDataView, (state, { id, dataViewId, indexNames }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        dataViewId,
        indexNames,
      },
    },
  }))
  .case(setActiveTabTimeline, (state, { id, activeTab, scrollToTop }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        activeTab,
        prevActiveTab: state.timelineById[id].activeTab,
        scrollToTop: scrollToTop
          ? {
              timestamp: Math.floor(Date.now() / 1000), // convert to seconds to avoid unnecessary rerenders for multiple clicks
            }
          : undefined,
      },
    },
  }))
  .case(toggleModalSaveTimeline, (state, { id, showModalSaveTimeline }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        showSaveModal: showModalSaveTimeline,
      },
    },
  }))
  .case(updateEqlOptions, (state, { id, field, value }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        eqlOptions: {
          ...(state.timelineById[id].eqlOptions ?? {}),
          [field]: value,
        },
      },
    },
  }))
  .case(setInsertTimeline, (state, insertTimeline) => ({
    ...state,
    insertTimeline,
  }))
  .case(showTimeline, (state, { id, show }) => ({
    ...state,
    timelineById: updateTimelineShowTimeline({ id, show, timelineById: state.timelineById }),
  }))
  .case(setTimelineUpdatedAt, (state, { id, updated }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        updated,
      },
    },
  }))
  .build();
