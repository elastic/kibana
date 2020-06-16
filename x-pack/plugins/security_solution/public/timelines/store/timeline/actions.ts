/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { Filter } from '../../../../../../../src/plugins/data/public';
import { Sort } from '../../../timelines/components/timeline/body/sort';
import {
  DataProvider,
  QueryOperator,
} from '../../../timelines/components/timeline/data_providers/data_provider';
import { KueryFilterQuery, SerializedFilterQuery } from '../../../common/store/types';

import { EventType, KqlMode, TimelineModel, ColumnHeaderOptions } from './model';
import { TimelineNonEcsData } from '../../../graphql/types';
import { TimelineTypeLiteral, TimelineIdLiteral } from '../../../../common/types/timeline';
import { InsertTimeline } from './types';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/timeline');

export const addHistory = actionCreator<{ id: TimelineIdLiteral; historyId: string }>(
  'ADD_HISTORY'
);

export const addNote = actionCreator<{ id: TimelineIdLiteral; noteId: string }>('ADD_NOTE');

export const addNoteToEvent = actionCreator<{
  id: TimelineIdLiteral;
  noteId: string;
  eventId: string;
}>('ADD_NOTE_TO_EVENT');

export const upsertColumn = actionCreator<{
  column: ColumnHeaderOptions;
  id: TimelineIdLiteral;
  index: number;
}>('UPSERT_COLUMN');

export const addProvider = actionCreator<{ id: TimelineIdLiteral; provider: DataProvider }>(
  'ADD_PROVIDER'
);

export const applyDeltaToWidth = actionCreator<{
  id: TimelineIdLiteral;
  delta: number;
  bodyClientWidthPixels: number;
  minWidthPixels: number;
  maxWidthPercent: number;
}>('APPLY_DELTA_TO_WIDTH');

export const applyDeltaToColumnWidth = actionCreator<{
  id: TimelineIdLiteral;
  columnId: string;
  delta: number;
}>('APPLY_DELTA_TO_COLUMN_WIDTH');

export const createTimeline = actionCreator<{
  id: TimelineIdLiteral;
  dataProviders?: DataProvider[];
  dateRange?: {
    start: number;
    end: number;
  };
  filters?: Filter[];
  columns: ColumnHeaderOptions[];
  itemsPerPage?: number;
  kqlQuery?: {
    filterQuery: SerializedFilterQuery | null;
    filterQueryDraft: KueryFilterQuery | null;
  };
  show?: boolean;
  sort?: Sort;
  showCheckboxes?: boolean;
  showRowRenderers?: boolean;
  timelineType?: TimelineTypeLiteral;
}>('CREATE_TIMELINE');

export const pinEvent = actionCreator<{ id: TimelineIdLiteral; eventId: string }>('PIN_EVENT');

export const removeColumn = actionCreator<{
  id: TimelineIdLiteral;
  columnId: string;
}>('REMOVE_COLUMN');

export const removeProvider = actionCreator<{
  id: TimelineIdLiteral;
  providerId: string;
  andProviderId?: string;
}>('REMOVE_PROVIDER');

export const showTimeline = actionCreator<{ id: TimelineIdLiteral; show: boolean }>(
  'SHOW_TIMELINE'
);

export const unPinEvent = actionCreator<{ id: TimelineIdLiteral; eventId: string }>('UN_PIN_EVENT');

export const updateTimeline = actionCreator<{
  id: TimelineIdLiteral;
  timeline: TimelineModel;
}>('UPDATE_TIMELINE');

export const addTimeline = actionCreator<{
  id: TimelineIdLiteral;
  timeline: TimelineModel;
}>('ADD_TIMELINE');

export const setInsertTimeline = actionCreator<InsertTimeline | null>('SET_INSERT_TIMELINE');

export const startTimelineSaving = actionCreator<{
  id: TimelineIdLiteral;
}>('START_TIMELINE_SAVING');

export const endTimelineSaving = actionCreator<{
  id: TimelineIdLiteral;
}>('END_TIMELINE_SAVING');

export const updateIsLoading = actionCreator<{
  id: TimelineIdLiteral;
  isLoading: boolean;
}>('UPDATE_LOADING');

export const updateColumns = actionCreator<{
  id: TimelineIdLiteral;
  columns: ColumnHeaderOptions[];
}>('UPDATE_COLUMNS');

export const updateDataProviderEnabled = actionCreator<{
  id: TimelineIdLiteral;
  enabled: boolean;
  providerId: string;
  andProviderId?: string;
}>('TOGGLE_PROVIDER_ENABLED');

export const updateDataProviderExcluded = actionCreator<{
  id: TimelineIdLiteral;
  excluded: boolean;
  providerId: string;
  andProviderId?: string;
}>('TOGGLE_PROVIDER_EXCLUDED');

export const dataProviderEdited = actionCreator<{
  andProviderId?: string;
  excluded: boolean;
  field: string;
  id: TimelineIdLiteral;
  operator: QueryOperator;
  providerId: string;
  value: string | number;
}>('DATA_PROVIDER_EDITED');

export const updateDataProviderKqlQuery = actionCreator<{
  id: TimelineIdLiteral;
  kqlQuery: string;
  providerId: string;
}>('PROVIDER_EDIT_KQL_QUERY');

export const updateHighlightedDropAndProviderId = actionCreator<{
  id: TimelineIdLiteral;
  providerId: string;
}>('UPDATE_DROP_AND_PROVIDER');

export const updateDescription = actionCreator<{ id: TimelineIdLiteral; description: string }>(
  'UPDATE_DESCRIPTION'
);

export const updateKqlMode = actionCreator<{ id: TimelineIdLiteral; kqlMode: KqlMode }>(
  'UPDATE_KQL_MODE'
);

export const setKqlFilterQueryDraft = actionCreator<{
  id: TimelineIdLiteral;
  filterQueryDraft: KueryFilterQuery;
}>('SET_KQL_FILTER_QUERY_DRAFT');

export const applyKqlFilterQuery = actionCreator<{
  id: TimelineIdLiteral;
  filterQuery: SerializedFilterQuery;
}>('APPLY_KQL_FILTER_QUERY');

export const updateIsFavorite = actionCreator<{ id: TimelineIdLiteral; isFavorite: boolean }>(
  'UPDATE_IS_FAVORITE'
);

export const updateIsLive = actionCreator<{ id: TimelineIdLiteral; isLive: boolean }>(
  'UPDATE_IS_LIVE'
);

export const updateItemsPerPage = actionCreator<{ id: TimelineIdLiteral; itemsPerPage: number }>(
  'UPDATE_ITEMS_PER_PAGE'
);

export const updateItemsPerPageOptions = actionCreator<{
  id: TimelineIdLiteral;
  itemsPerPageOptions: number[];
}>('UPDATE_ITEMS_PER_PAGE_OPTIONS');

export const updateTitle = actionCreator<{ id: TimelineIdLiteral; title: string }>('UPDATE_TITLE');

export const updatePageIndex = actionCreator<{ id: TimelineIdLiteral; activePage: number }>(
  'UPDATE_PAGE_INDEX'
);

export const updateProviders = actionCreator<{ id: TimelineIdLiteral; providers: DataProvider[] }>(
  'UPDATE_PROVIDERS'
);

export const updateRange = actionCreator<{ id: TimelineIdLiteral; start: number; end: number }>(
  'UPDATE_RANGE'
);

export const updateSort = actionCreator<{ id: TimelineIdLiteral; sort: Sort }>('UPDATE_SORT');

export const updateAutoSaveMsg = actionCreator<{
  timelineId: TimelineIdLiteral | null;
  newTimelineModel: TimelineModel | null;
}>('UPDATE_AUTO_SAVE');

export const showCallOutUnauthorizedMsg = actionCreator('SHOW_CALL_OUT_UNAUTHORIZED_MSG');

export const setSavedQueryId = actionCreator<{
  id: TimelineIdLiteral;
  savedQueryId: string | null;
}>('SET_TIMELINE_SAVED_QUERY');

export const setFilters = actionCreator<{
  id: TimelineIdLiteral;
  filters: Filter[];
}>('SET_TIMELINE_FILTERS');

export const setSelected = actionCreator<{
  id: TimelineIdLiteral;
  eventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  isSelected: boolean;
  isSelectAllChecked: boolean;
}>('SET_TIMELINE_SELECTED');

export const clearSelected = actionCreator<{
  id: TimelineIdLiteral;
}>('CLEAR_TIMELINE_SELECTED');

export const setEventsLoading = actionCreator<{
  id: TimelineIdLiteral;
  eventIds: string[];
  isLoading: boolean;
}>('SET_TIMELINE_EVENTS_LOADING');

export const clearEventsLoading = actionCreator<{
  id: TimelineIdLiteral;
}>('CLEAR_TIMELINE_EVENTS_LOADING');

export const setEventsDeleted = actionCreator<{
  id: TimelineIdLiteral;
  eventIds: string[];
  isDeleted: boolean;
}>('SET_TIMELINE_EVENTS_DELETED');

export const clearEventsDeleted = actionCreator<{
  id: TimelineIdLiteral;
}>('CLEAR_TIMELINE_EVENTS_DELETED');

export const updateEventType = actionCreator<{ id: TimelineIdLiteral; eventType: EventType }>(
  'UPDATE_EVENT_TYPE'
);
