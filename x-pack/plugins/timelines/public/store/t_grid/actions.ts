/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import actionCreatorFactory from 'typescript-fsa';
import { FilterManager } from '../../../../../../src/plugins/data/public';
import { TimelineNonEcsData } from '../../../common/search_strategy';
import {
  ColumnHeaderOptions,
  SortColumnTimeline,
  TimelineExpandedDetailType,
  TGridPersistInput,
  TimelineTabs,
} from '../../../common/types/timeline';

const actionCreator = actionCreatorFactory('x-pack/timelines/t-grid');

export const createTGrid = actionCreator<TGridPersistInput>('CREATE_TIMELINE');

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

export const initializeTGrid = actionCreator<{
  id: string;
  defaultColumns?: Array<
    Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
      ColumnHeaderOptions
  >;
  documentType?: string;
  excludedRowRendererIds?: string[];
  filterManager?: FilterManager;
  footerText?: string;
  isLoading?: boolean;
  loadingText?: string;
  queryFields?: string[];
  selectAll?: boolean;
  title?: string;
  unit?: (n: number) => string;
}>('INITIALIZE_TGRID');

export const setTGridIsLoading = actionCreator<{ id: string; isTGridLoading: boolean }>(
  'SET_TGRID_IS_LOADING'
);
export const setTGridSelectAll = actionCreator<{ id: string; selectAll: boolean }>(
  'SET_TGRID_SELECT_ALL'
);
