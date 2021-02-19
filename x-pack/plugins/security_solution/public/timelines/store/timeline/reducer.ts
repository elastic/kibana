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
  applyDeltaToColumnWidth,
  applyKqlFilterQuery,
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
  createTimeline,
  dataProviderEdited,
  endTimelineSaving,
  pinEvent,
  removeColumn,
  removeProvider,
  setEventsDeleted,
  setActiveTabTimeline,
  setEventsLoading,
  setExcludedRowRendererIds,
  setFilters,
  setInsertTimeline,
  setSavedQueryId,
  setSelected,
  showCallOutUnauthorizedMsg,
  showTimeline,
  startTimelineSaving,
  toggleDetailPanel,
  unPinEvent,
  updateAutoSaveMsg,
  updateColumns,
  updateDataProviderEnabled,
  updateDataProviderExcluded,
  updateDataProviderKqlQuery,
  updateDataProviderType,
  updateEventType,
  updateIndexNames,
  updateIsFavorite,
  updateIsLive,
  updateIsLoading,
  updateItemsPerPage,
  updateItemsPerPageOptions,
  updateKqlMode,
  updatePageIndex,
  updateProviders,
  updateRange,
  updateSort,
  updateTimeline,
  updateTimelineGraphEventId,
  updateTitleAndDescription,
  upsertColumn,
  toggleModalSaveTimeline,
  updateEqlOptions,
} from './actions';
import {
  addNewTimeline,
  addTimelineHistory,
  addTimelineNote,
  addTimelineNoteToEvent,
  addTimelineProvider,
  addTimelineToStore,
  applyDeltaToTimelineColumnWidth,
  applyKqlFilterQueryDraft,
  pinTimelineEvent,
  removeTimelineColumn,
  removeTimelineProvider,
  setDeletedTimelineEvents,
  setLoadingTimelineEvents,
  setSelectedTimelineEvents,
  unPinTimelineEvent,
  updateExcludedRowRenderersIds,
  updateTimelineColumns,
  updateTimelineIsFavorite,
  updateTimelineIsLive,
  updateTimelineItemsPerPage,
  updateTimelineKqlMode,
  updateTimelinePageIndex,
  updateTimelinePerPageOptions,
  updateTimelineProviderEnabled,
  updateTimelineProviderExcluded,
  updateTimelineProviderProperties,
  updateTimelineProviderKqlQuery,
  updateTimelineProviderType,
  updateTimelineProviders,
  updateTimelineRange,
  updateTimelineShowTimeline,
  updateTimelineSort,
  updateTimelineTitleAndDescription,
  upsertTimelineColumn,
  updateSavedQuery,
  updateGraphEventId,
  updateFilters,
  updateTimelineDetailsPanel,
  updateTimelineEventType,
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
  .case(addTimeline, (state, { id, timeline }) => ({
    ...state,
    timelineById: addTimelineToStore({ id, timeline, timelineById: state.timelineById }),
  }))
  .case(
    createTimeline,
    (
      state,
      {
        id,
        dataProviders,
        dateRange,
        excludedRowRendererIds,
        expandedDetail = {},
        show,
        columns,
        itemsPerPage,
        indexNames,
        kqlQuery,
        sort,
        showCheckboxes,
        timelineType = TimelineType.default,
        filters,
      }
    ) => {
      return {
        ...state,
        timelineById: addNewTimeline({
          columns,
          dataProviders,
          dateRange,
          excludedRowRendererIds,
          expandedDetail,
          filters,
          id,
          itemsPerPage,
          indexNames,
          kqlQuery,
          sort,
          show,
          showCheckboxes,
          timelineById: state.timelineById,
          timelineType,
        }),
      };
    }
  )
  .case(upsertColumn, (state, { column, id, index }) => ({
    ...state,
    timelineById: upsertTimelineColumn({ column, id, index, timelineById: state.timelineById }),
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
  .case(toggleDetailPanel, (state, action) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [action.timelineId]: {
        ...state.timelineById[action.timelineId],
        expandedDetail: {
          ...state.timelineById[action.timelineId].expandedDetail,
          ...updateTimelineDetailsPanel(action),
        },
      },
    },
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
  .case(applyDeltaToColumnWidth, (state, { id, columnId, delta }) => ({
    ...state,
    timelineById: applyDeltaToTimelineColumnWidth({
      id,
      columnId,
      delta,
      timelineById: state.timelineById,
    }),
  }))
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
  .case(setEventsDeleted, (state, { id, eventIds, isDeleted }) => ({
    ...state,
    timelineById: setDeletedTimelineEvents({
      id,
      eventIds,
      timelineById: state.timelineById,
      isDeleted,
    }),
  }))
  .case(clearEventsDeleted, (state, { id }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        deletedEventIds: [],
      },
    },
  }))
  .case(setEventsLoading, (state, { id, eventIds, isLoading }) => ({
    ...state,
    timelineById: setLoadingTimelineEvents({
      id,
      eventIds,
      timelineById: state.timelineById,
      isLoading,
    }),
  }))
  .case(clearEventsLoading, (state, { id }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        loadingEventIds: [],
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
  .case(setSelected, (state, { id, eventIds, isSelected, isSelectAllChecked }) => ({
    ...state,
    timelineById: setSelectedTimelineEvents({
      id,
      eventIds,
      timelineById: state.timelineById,
      isSelected,
      isSelectAllChecked,
    }),
  }))
  .case(clearSelected, (state, { id }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        selectedEventIds: {},
        isSelectAllChecked: false,
      },
    },
  }))
  .case(updateIsLoading, (state, { id, isLoading }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        isLoading,
      },
    },
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
  .case(updateColumns, (state, { id, columns }) => ({
    ...state,
    timelineById: updateTimelineColumns({
      id,
      columns,
      timelineById: state.timelineById,
    }),
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
  .case(updateIndexNames, (state, { id, indexNames }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        indexNames,
      },
    },
  }))
  .case(setActiveTabTimeline, (state, { id, activeTab }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        activeTab,
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
  .build();
