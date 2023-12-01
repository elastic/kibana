/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
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
  updateDataProviderEnabled,
  updateDataProviderExcluded,
  updateDataProviderType,
  updateDataView,
  updateIsFavorite,
  updateKqlMode,
  updateProviders,
  updateRange,
  updateTimeline,
  updateGraphEventId,
  updateTitleAndDescription,
  updateSessionViewConfig,
  toggleModalSaveTimeline,
  updateEqlOptions,
  toggleDetailPanel,
  setEventsLoading,
  removeColumn,
  upsertColumn,
  updateColumns,
  updateIsLoading,
  updateSort,
  clearSelected,
  setSelected,
  setEventsDeleted,
  initializeTimelineSettings,
  updateItemsPerPage,
  updateItemsPerPageOptions,
  applyDeltaToColumnWidth,
  clearEventsDeleted,
  clearEventsLoading,
  updateSavedSearchId,
  updateSavedSearch,
  initializeSavedSearch,
  setIsDiscoverSavedSearchLoaded,
  setDataProviderVisibility,
  setChanged,
} from './actions';

import {
  addNewTimeline,
  addTimelineNote,
  addTimelineNoteToEvent,
  addTimelineProviders,
  addTimelineToStore,
  applyKqlFilterQueryDraft,
  pinTimelineEvent,
  removeTimelineProvider,
  unPinTimelineEvent,
  updateExcludedRowRenderersIds,
  updateTimelineIsFavorite,
  updateTimelineKqlMode,
  updateTimelineProviderEnabled,
  updateTimelineProviderExcluded,
  updateTimelineProviderProperties,
  updateTimelineProviderType,
  updateTimelineProviders,
  updateTimelineRange,
  updateTimelineShowTimeline,
  updateTimelineTitleAndDescription,
  updateSavedQuery,
  updateTimelineGraphEventId,
  updateFilters,
  updateTimelineSessionViewConfig,
  updateTimelineDetailsPanel,
  setLoadingTableEvents,
  removeTableColumn,
  upsertTableColumn,
  updateTableColumns,
  updateTableSort,
  setSelectedTableEvents,
  setDeletedTableEvents,
  setInitializeTimelineSettings,
  applyDeltaToTableColumnWidth,
  updateTimelinePerPageOptions,
  updateTimelineItemsPerPage,
} from './helpers';

import type { TimelineState } from './types';
import { EMPTY_TIMELINE_BY_ID } from './types';
import { TimelineType } from '../../../../common/api/timeline';

export const initialTimelineState: TimelineState = {
  timelineById: EMPTY_TIMELINE_BY_ID,
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
  .case(addNote, (state, { id, noteId }) => ({
    ...state,
    timelineById: addTimelineNote({ id, noteId, timelineById: state.timelineById }),
  }))
  .case(addNoteToEvent, (state, { id, noteId, eventId }) => ({
    ...state,
    timelineById: addTimelineNoteToEvent({ id, noteId, eventId, timelineById: state.timelineById }),
  }))
  .case(addProvider, (state, { id, providers }) => ({
    ...state,
    timelineById: addTimelineProviders({ id, providers, timelineById: state.timelineById }),
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
  .case(updateGraphEventId, (state, { id, graphEventId }) => ({
    ...state,
    timelineById: updateTimelineGraphEventId({
      id,
      graphEventId,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateSessionViewConfig, (state, { id, sessionViewConfig }) => ({
    ...state,
    timelineById: updateTimelineSessionViewConfig({
      id,
      sessionViewConfig,
      timelineById: state.timelineById,
    }),
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
  .case(updateIsFavorite, (state, { id, isFavorite }) => ({
    ...state,
    timelineById: updateTimelineIsFavorite({ id, isFavorite, timelineById: state.timelineById }),
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
  .case(toggleDetailPanel, (state, action) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [action.id]: {
        ...state.timelineById[action.id],
        expandedDetail: {
          ...state.timelineById[action.id].expandedDetail,
          ...updateTimelineDetailsPanel(action),
        },
      },
    },
  }))
  .case(setEventsLoading, (state, { id, eventIds, isLoading }) => ({
    ...state,
    timelineById: setLoadingTableEvents({
      id,
      eventIds,
      timelineById: state.timelineById,
      isLoading,
    }),
  }))
  .case(removeColumn, (state, { id, columnId }) => ({
    ...state,
    timelineById: removeTableColumn({
      id,
      columnId,
      timelineById: state.timelineById,
    }),
  }))
  .case(upsertColumn, (state, { column, id, index }) => ({
    ...state,
    timelineById: upsertTableColumn({ column, id, index, timelineById: state.timelineById }),
  }))
  .case(updateColumns, (state, { id, columns }) => ({
    ...state,
    timelineById: updateTableColumns({
      id,
      columns,
      timelineById: state.timelineById,
    }),
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
  .case(updateSort, (state, { id, sort }) => ({
    ...state,
    timelineById: updateTableSort({ id, sort, timelineById: state.timelineById }),
  }))
  .case(setSelected, (state, { id, eventIds, isSelected, isSelectAllChecked }) => ({
    ...state,
    timelineById: setSelectedTableEvents({
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
  .case(setEventsDeleted, (state, { id, eventIds, isDeleted }) => ({
    ...state,
    timelineById: setDeletedTableEvents({
      id,
      eventIds,
      timelineById: state.timelineById,
      isDeleted,
    }),
  }))
  .case(initializeTimelineSettings, (state, { id, ...timelineSettingsProps }) => ({
    ...state,
    timelineById: setInitializeTimelineSettings({
      id,
      timelineById: state.timelineById,
      timelineSettingsProps,
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
  .case(updateItemsPerPageOptions, (state, { id, itemsPerPageOptions }) => ({
    ...state,
    timelineById: updateTimelinePerPageOptions({
      id,
      itemsPerPageOptions,
      timelineById: state.timelineById,
    }),
  }))
  .case(applyDeltaToColumnWidth, (state, { id, columnId, delta }) => ({
    ...state,
    timelineById: applyDeltaToTableColumnWidth({
      id,
      columnId,
      delta,
      timelineById: state.timelineById,
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
  .case(updateSavedSearchId, (state, { id, savedSearchId }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        savedSearchId,
      },
    },
  }))
  .case(initializeSavedSearch, (state, { id, savedSearch }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        savedSearch,
      },
    },
  }))
  .case(updateSavedSearch, (state, { id, savedSearch }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        savedSearch,
      },
    },
  }))
  .case(setIsDiscoverSavedSearchLoaded, (state, { id, isDiscoverSavedSearchLoaded }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        isDiscoverSavedSearchLoaded,
      },
    },
  }))
  .case(setDataProviderVisibility, (state, { id, isDataProviderVisible }) => {
    return {
      ...state,
      timelineById: {
        ...state.timelineById,
        [id]: {
          ...state.timelineById[id],
          isDataProviderVisible,
        },
      },
    };
  })
  .case(setChanged, (state, { id, changed }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        changed,
      },
    },
  }))
  .build();
