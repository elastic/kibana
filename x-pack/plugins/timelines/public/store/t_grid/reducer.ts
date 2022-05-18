/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  addProviderToTimeline,
  applyDeltaToColumnWidth,
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
  createTGrid,
  initializeTGridSettings,
  removeColumn,
  setEventsDeleted,
  setEventsLoading,
  setTGridSelectAll,
  setSelected,
  setTimelineUpdatedAt,
  toggleDetailPanel,
  updateColumnOrder,
  updateColumns,
  updateColumnWidth,
  updateIsLoading,
  updateItemsPerPage,
  updateItemsPerPageOptions,
  updateSort,
  upsertColumn,
} from './actions';

import {
  addProviderToTimelineHelper,
  applyDeltaToTimelineColumnWidth,
  createInitTGrid,
  setInitializeTgridSettings,
  removeTimelineColumn,
  setDeletedTimelineEvents,
  setLoadingTimelineEvents,
  setSelectedTimelineEvents,
  updateTGridColumnOrder,
  updateTGridColumnWidth,
  updateTimelineColumns,
  updateTimelineItemsPerPage,
  updateTimelinePerPageOptions,
  updateTimelineSort,
  upsertTimelineColumn,
  updateTimelineDetailsPanel,
} from './helpers';

import { TimelineState, EMPTY_TIMELINE_BY_ID } from './types';

export const initialTGridState: TimelineState = {
  timelineById: EMPTY_TIMELINE_BY_ID,
};

/** The reducer for all timeline actions  */
export const tGridReducer = reducerWithInitialState(initialTGridState)
  .case(upsertColumn, (state, { column, id, index }) => ({
    ...state,
    timelineById: upsertTimelineColumn({ column, id, index, timelineById: state.timelineById }),
  }))
  .case(createTGrid, (state, timelineProps) => {
    return {
      ...state,
      timelineById: createInitTGrid({
        ...timelineProps,
        timelineById: state.timelineById,
      }),
    };
  })
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
  .case(applyDeltaToColumnWidth, (state, { id, columnId, delta }) => ({
    ...state,
    timelineById: applyDeltaToTimelineColumnWidth({
      id,
      columnId,
      delta,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateColumnOrder, (state, { id, columnIds }) => ({
    ...state,
    timelineById: updateTGridColumnOrder({
      columnIds,
      id,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateColumnWidth, (state, { id, columnId, width }) => ({
    ...state,
    timelineById: updateTGridColumnWidth({
      columnId,
      id,
      timelineById: state.timelineById,
      width,
    }),
  }))
  .case(removeColumn, (state, { id, columnId }) => ({
    ...state,
    timelineById: removeTimelineColumn({
      id,
      columnId,
      timelineById: state.timelineById,
    }),
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
  .case(updateColumns, (state, { id, columns }) => ({
    ...state,
    timelineById: updateTimelineColumns({
      id,
      columns,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateSort, (state, { id, sort }) => ({
    ...state,
    timelineById: updateTimelineSort({ id, sort, timelineById: state.timelineById }),
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
  .case(initializeTGridSettings, (state, { id, ...tGridSettingsProps }) => ({
    ...state,
    timelineById: setInitializeTgridSettings({
      id,
      timelineById: state.timelineById,
      tGridSettingsProps,
    }),
  }))
  .case(setTGridSelectAll, (state, { id, selectAll }) => ({
    ...state,
    timelineById: {
      ...state.timelineById,
      [id]: {
        ...state.timelineById[id],
        selectAll,
      },
    },
  }))
  .case(addProviderToTimeline, (state, { id, dataProvider }) => ({
    ...state,
    timelineById: addProviderToTimelineHelper(id, dataProvider, state.timelineById),
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
