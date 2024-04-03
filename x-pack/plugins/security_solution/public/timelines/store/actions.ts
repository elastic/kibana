/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { Filter } from '@kbn/es-query';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';

import type { SessionViewConfig } from '../../../common/types';
import type {
  DataProvider,
  DataProviderType,
  QueryOperator,
} from '../components/timeline/data_providers/data_provider';

import type { KqlMode, TimelineModel } from './model';
import type { InitialyzeTimelineSettings, InsertTimeline } from './types';
import type {
  FieldsEqlOptions,
  TimelineNonEcsData,
} from '../../../common/search_strategy/timeline';
import type {
  TimelineTabs,
  TimelinePersistInput,
  SerializedFilterQuery,
  ToggleDetailPanel,
  ColumnHeaderOptions,
  SortColumnTimeline,
} from '../../../common/types/timeline';
import type { RowRendererId } from '../../../common/api/timeline';
import type { ResolveTimelineConfig } from '../components/open_timeline/types';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/timeline');

export const addNote = actionCreator<{ id: string; noteId: string }>('ADD_NOTE');

export const addNoteToEvent = actionCreator<{
  id: string;
  noteId: string;
  eventId: string;
}>('ADD_NOTE_TO_EVENT');

export const deleteNoteFromEvent = actionCreator<{ id: string; noteId: string; eventId: string }>(
  'DELETE_NOTE_FROM_EVENT'
);

export const showTimeline = actionCreator<{ id: string; show: boolean }>('SHOW_TIMELINE');

export const setInsertTimeline = actionCreator<InsertTimeline | null>('SET_INSERT_TIMELINE');

export const addProvider = actionCreator<{ id: string; providers: DataProvider[] }>('ADD_PROVIDER');

export const saveTimeline = actionCreator<{ id: string; saveAsNew: boolean }>('SAVE_TIMELINE');

export const createTimeline = actionCreator<TimelinePersistInput>('CREATE_TIMELINE');

export const pinEvent = actionCreator<{ id: string; eventId: string }>('PIN_EVENT');

export const removeProvider = actionCreator<{
  id: string;
  providerId: string;
  andProviderId?: string;
}>('REMOVE_PROVIDER');

export const updateGraphEventId = actionCreator<{ id: string; graphEventId: string }>(
  'UPDATE_TIMELINE_GRAPH_EVENT_ID'
);

export const updateSessionViewConfig = actionCreator<{
  id: string;
  sessionViewConfig: SessionViewConfig | null;
}>('UPDATE_TIMELINE_SESSION_VIEW_CONFIG');

export const unPinEvent = actionCreator<{ id: string; eventId: string }>('UN_PIN_EVENT');

export const updateTimeline = actionCreator<{
  id: string;
  timeline: TimelineModel;
}>('UPDATE_TIMELINE');

export const addTimeline = actionCreator<{
  id: string;
  timeline: TimelineModel;
  resolveTimelineConfig?: ResolveTimelineConfig;
  savedTimeline?: boolean;
}>('ADD_TIMELINE');

export const startTimelineSaving = actionCreator<{
  id: string;
}>('START_TIMELINE_SAVING');

export const endTimelineSaving = actionCreator<{
  id: string;
}>('END_TIMELINE_SAVING');

export const updateDataProviderEnabled = actionCreator<{
  id: string;
  enabled: boolean;
  providerId: string;
  andProviderId?: string;
}>('TOGGLE_PROVIDER_ENABLED');

export const updateDataProviderExcluded = actionCreator<{
  id: string;
  excluded: boolean;
  providerId: string;
  andProviderId?: string;
}>('TOGGLE_PROVIDER_EXCLUDED');

export const dataProviderEdited = actionCreator<{
  andProviderId?: string;
  excluded: boolean;
  field: string;
  id: string;
  operator: QueryOperator;
  providerId: string;
  value: string | number | Array<string | number>;
}>('DATA_PROVIDER_EDITED');

export const updateDataProviderType = actionCreator<{
  andProviderId?: string;
  id: string;
  type: DataProviderType;
  providerId: string;
}>('UPDATE_PROVIDER_TYPE');

export const updateKqlMode = actionCreator<{ id: string; kqlMode: KqlMode }>('UPDATE_KQL_MODE');

export const applyKqlFilterQuery = actionCreator<{
  id: string;
  filterQuery: SerializedFilterQuery;
}>('APPLY_KQL_FILTER_QUERY');

export const updateIsFavorite = actionCreator<{ id: string; isFavorite: boolean }>(
  'UPDATE_IS_FAVORITE'
);

export const updateTitleAndDescription = actionCreator<{
  description: string;
  id: string;
  title: string;
}>('UPDATE_TITLE_AND_DESCRIPTION');

export const updateProviders = actionCreator<{ id: string; providers: DataProvider[] }>(
  'UPDATE_PROVIDERS'
);

export const updateRange = actionCreator<{ id: string; start: string; end: string }>(
  'UPDATE_RANGE'
);

export const showCallOutUnauthorizedMsg = actionCreator('SHOW_CALL_OUT_UNAUTHORIZED_MSG');

export const setSavedQueryId = actionCreator<{
  id: string;
  savedQueryId: string | null;
}>('SET_TIMELINE_SAVED_QUERY');

export const setFilters = actionCreator<{
  id: string;
  filters: Filter[];
}>('SET_TIMELINE_FILTERS');

export const setExcludedRowRendererIds = actionCreator<{
  id: string;
  excludedRowRendererIds: RowRendererId[];
}>('SET_TIMELINE_EXCLUDED_ROW_RENDERER_IDS');

export const updateDataView = actionCreator<{
  id: string;
  dataViewId: string;
  indexNames: string[];
}>('UPDATE_DATA_VIEW');

export const setActiveTabTimeline = actionCreator<{
  id: string;
  activeTab: TimelineTabs;
  scrollToTop?: boolean;
}>('SET_ACTIVE_TAB_TIMELINE');

export const toggleModalSaveTimeline = actionCreator<{
  id: string;
  showModalSaveTimeline: boolean;
}>('TOGGLE_MODAL_SAVE_TIMELINE');

export const updateEqlOptions = actionCreator<{
  id: string;
  field: FieldsEqlOptions;
  value: string | undefined;
}>('UPDATE_EQL_OPTIONS_TIMELINE');

export const updateIsLoading = actionCreator<{
  id: string;
  isLoading: boolean;
}>('UPDATE_LOADING');

export const toggleDetailPanel = actionCreator<ToggleDetailPanel>('TOGGLE_DETAIL_PANEL');

export const setEventsLoading = actionCreator<{
  id: string;
  eventIds: string[];
  isLoading: boolean;
}>('SET_TIMELINE_EVENTS_LOADING');

export const setEventsDeleted = actionCreator<{
  id: string;
  eventIds: string[];
  isDeleted: boolean;
}>('SET_TIMELINE_EVENTS_DELETED');

export const removeColumn = actionCreator<{
  id: string;
  columnId: string;
}>('REMOVE_COLUMN');

export const updateColumns = actionCreator<{
  id: string;
  columns: ColumnHeaderOptions[];
}>('UPDATE_COLUMNS');

export const updateSort = actionCreator<{ id: string; sort: SortColumnTimeline[] }>('UPDATE_SORT');

export const upsertColumn = actionCreator<{
  column: ColumnHeaderOptions;
  id: string;
  index: number;
}>('UPSERT_COLUMN');

export const setSelected = actionCreator<{
  id: string;
  eventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  isSelected: boolean;
  isSelectAllChecked: boolean;
}>('SET_TIMELINE_SELECTED');

export const clearSelected = actionCreator<{
  id: string;
}>('CLEAR_TIMELINE_SELECTED');

export const initializeTimelineSettings =
  actionCreator<InitialyzeTimelineSettings>('INITIALIZE_TIMELINE');

export const updateItemsPerPage = actionCreator<{ id: string; itemsPerPage: number }>(
  'UPDATE_ITEMS_PER_PAGE'
);

export const updateItemsPerPageOptions = actionCreator<{
  id: string;
  itemsPerPageOptions: number[];
}>('UPDATE_ITEMS_PER_PAGE_OPTIONS');

export const applyDeltaToColumnWidth = actionCreator<{
  id: string;
  columnId: string;
  delta: number;
}>('APPLY_DELTA_TO_COLUMN_WIDTH');

export const clearEventsLoading = actionCreator<{
  id: string;
}>('CLEAR_TGRID_EVENTS_LOADING');

export const clearEventsDeleted = actionCreator<{
  id: string;
}>('CLEAR_TGRID_EVENTS_DELETED');

export const updateTotalCount = actionCreator<{ id: string; totalCount: number }>(
  'UPDATE_TOTAL_COUNT'
);

export const updateSavedSearchId = actionCreator<{
  id: string;
  savedSearchId: string;
}>('UPDATE_DISCOVER_SAVED_SEARCH_ID');

export const initializeSavedSearch = actionCreator<{
  id: string;
  savedSearch: SavedSearch;
}>('INITIALIZE_SAVED_SEARCH');

export const updateSavedSearch = actionCreator<{
  id: string;
  savedSearch: SavedSearch;
}>('UPDATE_SAVED_SEARCH');

export const setDataProviderVisibility = actionCreator<{
  id: string;
  isDataProviderVisible: boolean;
}>('SET_DATA_PROVIDER_VISIBLITY');

export const setChanged = actionCreator<{ id: string; changed: boolean }>('SET_CHANGED');

export const setConfirmingNoteId = actionCreator<{
  id: string;
  confirmingNoteId: string | null | undefined;
}>('SET_CONFIRMING_NOTE_ID');
