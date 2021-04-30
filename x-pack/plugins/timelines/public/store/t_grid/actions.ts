/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { TimelineNonEcsData } from '../../../../security_solution/common/search_strategy';
import {
  SortColumnTimeline,
  TimelineExpandedDetailType,
  TimelineTabs,
} from '../../../../security_solution/common/types/timeline';
import { ColumnHeaderOptions } from './model';

const actionCreator = actionCreatorFactory('x-pack/timelines/t-grid');

export const upsertColumn = actionCreator<{
  column: ColumnHeaderOptions;
  id: string;
  index: number;
}>('UPSERT_COLUMN');

export const applyDeltaToColumnWidth = actionCreator<{
  id: string;
  columnId: string;
  delta: number;
}>('APPLY_DELTA_TO_COLUMN_WIDTH');

export type ToggleDetailPanel = TimelineExpandedDetailType & {
  tabType?: TimelineTabs;
  timelineId: string;
};

export const toggleDetailPanel = actionCreator<ToggleDetailPanel>('TOGGLE_DETAIL_PANEL');

export const removeColumn = actionCreator<{
  id: string;
  columnId: string;
}>('REMOVE_COLUMN');

export const updateIsLoading = actionCreator<{
  id: string;
  isLoading: boolean;
}>('UPDATE_LOADING');

export const updateColumns = actionCreator<{
  id: string;
  columns: ColumnHeaderOptions[];
}>('UPDATE_COLUMNS');

export const updateItemsPerPage = actionCreator<{ id: string; itemsPerPage: number }>(
  'UPDATE_ITEMS_PER_PAGE'
);

export const updateItemsPerPageOptions = actionCreator<{
  id: string;
  itemsPerPageOptions: number[];
}>('UPDATE_ITEMS_PER_PAGE_OPTIONS');

export const updateSort = actionCreator<{ id: string; sort: SortColumnTimeline[] }>('UPDATE_SORT');

export const setSelected = actionCreator<{
  id: string;
  eventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  isSelected: boolean;
  isSelectAllChecked: boolean;
}>('SET_TIMELINE_SELECTED');

export const clearSelected = actionCreator<{
  id: string;
}>('CLEAR_TIMELINE_SELECTED');

export const setEventsLoading = actionCreator<{
  id: string;
  eventIds: string[];
  isLoading: boolean;
}>('SET_TIMELINE_EVENTS_LOADING');

export const clearEventsLoading = actionCreator<{
  id: string;
}>('CLEAR_TIMELINE_EVENTS_LOADING');

export const setEventsDeleted = actionCreator<{
  id: string;
  eventIds: string[];
  isDeleted: boolean;
}>('SET_TIMELINE_EVENTS_DELETED');

export const clearEventsDeleted = actionCreator<{
  id: string;
}>('CLEAR_TIMELINE_EVENTS_DELETED');
