/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { Filter } from '@kbn/es-query';

import {
  DataProvider,
  DataProviderType,
  QueryOperator,
} from '../../../timelines/components/timeline/data_providers/data_provider';

import { KqlMode, TimelineModel } from './model';
import { InsertTimeline } from './types';
import { FieldsEqlOptions } from '../../../../common/search_strategy/timeline';
import type {
  TimelineEventsType,
  RowRendererId,
  TimelineTabs,
  TimelinePersistInput,
  SerializedFilterQuery,
} from '../../../../common/types/timeline';
export {
  applyDeltaToColumnWidth,
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
  initializeTGridSettings,
  removeColumn,
  setEventsDeleted,
  setEventsLoading,
  setSelected,
  setTGridSelectAll,
  toggleDetailPanel,
  updateColumnOrder,
  updateColumns,
  updateColumnWidth,
  updateIsLoading,
  updateItemsPerPage,
  updateItemsPerPageOptions,
  updateSort,
  upsertColumn,
} from '../../../../../timelines/public';
import { ResolveTimelineConfig } from '../../components/open_timeline/types';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/timeline');

export const addHistory = actionCreator<{ id: string; historyId: string }>('ADD_HISTORY');

export const addNote = actionCreator<{ id: string; noteId: string }>('ADD_NOTE');

export const addNoteToEvent =
  actionCreator<{ id: string; noteId: string; eventId: string }>('ADD_NOTE_TO_EVENT');

export const showTimeline = actionCreator<{ id: string; show: boolean }>('SHOW_TIMELINE');

export const setInsertTimeline = actionCreator<InsertTimeline | null>('SET_INSERT_TIMELINE');

export const addProvider = actionCreator<{ id: string; provider: DataProvider }>('ADD_PROVIDER');

export const saveTimeline = actionCreator<TimelinePersistInput>('SAVE_TIMELINE');

export const createTimeline = actionCreator<TimelinePersistInput>('CREATE_TIMELINE');

export const pinEvent = actionCreator<{ id: string; eventId: string }>('PIN_EVENT');

export const setTimelineUpdatedAt =
  actionCreator<{ id: string; updated: number }>('SET_TIMELINE_UPDATED_AT');

export const removeProvider = actionCreator<{
  id: string;
  providerId: string;
  andProviderId?: string;
}>('REMOVE_PROVIDER');

export const updateTimelineGraphEventId = actionCreator<{ id: string; graphEventId: string }>(
  'UPDATE_TIMELINE_GRAPH_EVENT_ID'
);

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
  value: string | number;
}>('DATA_PROVIDER_EDITED');

export const updateDataProviderKqlQuery = actionCreator<{
  id: string;
  kqlQuery: string;
  providerId: string;
}>('PROVIDER_EDIT_KQL_QUERY');

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

export const updateIsFavorite =
  actionCreator<{ id: string; isFavorite: boolean }>('UPDATE_IS_FAVORITE');

export const updateIsLive = actionCreator<{ id: string; isLive: boolean }>('UPDATE_IS_LIVE');

export const updateTitleAndDescription = actionCreator<{
  description: string;
  id: string;
  title: string;
}>('UPDATE_TITLE_AND_DESCRIPTION');

export const updatePageIndex =
  actionCreator<{ id: string; activePage: number }>('UPDATE_PAGE_INDEX');

export const updateProviders =
  actionCreator<{ id: string; providers: DataProvider[] }>('UPDATE_PROVIDERS');

export const updateRange =
  actionCreator<{ id: string; start: string; end: string }>('UPDATE_RANGE');

export const updateAutoSaveMsg = actionCreator<{
  timelineId: string | null;
  newTimelineModel: TimelineModel | null;
}>('UPDATE_AUTO_SAVE');

export const showCallOutUnauthorizedMsg = actionCreator('SHOW_CALL_OUT_UNAUTHORIZED_MSG');

export const setSavedQueryId = actionCreator<{
  id: string;
  savedQueryId: string | null;
}>('SET_TIMELINE_SAVED_QUERY');

export const setFilters = actionCreator<{
  id: string;
  filters: Filter[];
}>('SET_TIMELINE_FILTERS');

export const updateEventType =
  actionCreator<{ id: string; eventType: TimelineEventsType }>('UPDATE_EVENT_TYPE');

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
  value: string | null;
}>('UPDATE_EQL_OPTIONS_TIMELINE');
