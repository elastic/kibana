/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { SessionViewConfig } from '../../../timelines/components/timeline/session_tab_content/use_session_view';
import type { TimelineNonEcsData } from '../../../../common/search_strategy';
import type { ColumnHeaderOptions, TimelineExpandedDetailType } from '../../../../common/types';
import type { SortColumnTable } from '../../components/data_table/types';
import type { InitialyzeTGridSettings, TGridPersistInput } from './types';

const actionCreator = actionCreatorFactory('x-pack/timelines/t-grid');

export const createTGrid = actionCreator<TGridPersistInput>('CREATE_TGRID');

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

export const updateColumnOrder = actionCreator<{
  columnIds: string[];
  id: string;
}>('UPDATE_COLUMN_ORDER');

export const updateColumnWidth = actionCreator<{
  columnId: string;
  id: string;
  width: number;
}>('UPDATE_COLUMN_WIDTH');

export type TableToggleDetailPanel = TimelineExpandedDetailType & {
  tabType?: string;
  id: string;
};

export const toggleDetailPanel = actionCreator<TableToggleDetailPanel>('TOGGLE_DETAIL_PANEL');

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

export const updateSort = actionCreator<{ id: string; sort: SortColumnTable[] }>('UPDATE_SORT');

export const setSelected = actionCreator<{
  id: string;
  eventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  isSelected: boolean;
  isSelectAllChecked: boolean;
}>('SET_TGRID_SELECTED');

export const clearSelected = actionCreator<{
  id: string;
}>('CLEAR_TGRID_SELECTED');

export const setEventsLoading = actionCreator<{
  id: string;
  eventIds: string[];
  isLoading: boolean;
}>('SET_TGRID_EVENTS_LOADING');

export const clearEventsLoading = actionCreator<{
  id: string;
}>('CLEAR_TGRID_EVENTS_LOADING');

export const setEventsDeleted = actionCreator<{
  id: string;
  eventIds: string[];
  isDeleted: boolean;
}>('SET_TGRID_EVENTS_DELETED');

export const clearEventsDeleted = actionCreator<{
  id: string;
}>('CLEAR_TGRID_EVENTS_DELETED');

export const initializeTGridSettings = actionCreator<InitialyzeTGridSettings>('INITIALIZE_TGRID');

export const setTGridSelectAll = actionCreator<{ id: string; selectAll: boolean }>(
  'SET_TGRID_SELECT_ALL'
);

export const updateGraphEventId = actionCreator<{ id: string; graphEventId: string }>(
  'UPDATE_TGRID_GRAPH_EVENT_ID'
);

export const updateSessionViewConfig = actionCreator<{
  id: string;
  sessionViewConfig: SessionViewConfig | null;
}>('UPDATE_TGRID_SESSION_VIEW_CONFIG');

export const setTableUpdatedAt = actionCreator<{ id: string; updated: number }>(
  'SET_TABLE_UPDATED_AT'
);
