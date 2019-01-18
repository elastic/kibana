/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { Sort } from '../../../components/timeline/body/sort';
import { DataProvider } from '../../../components/timeline/data_providers/data_provider';
import { KqlMode } from './model';

const actionCreator = actionCreatorFactory('x-pack/secops/local/timeline');

export const addHistory = actionCreator<{ id: string; historyId: string }>('ADD_HISTORY');

export const addNote = actionCreator<{ id: string; noteId: string }>('ADD_NOTE');

export const addNoteToEvent = actionCreator<{ id: string; noteId: string; eventId: string }>(
  'ADD_NOTE_TO_EVENT'
);

export const addProvider = actionCreator<{ id: string; provider: DataProvider }>('ADD_PROVIDER');

export const applyDeltaToWidth = actionCreator<{
  id: string;
  delta: number;
  bodyClientWidthPixels: number;
  minWidthPixels: number;
  maxWidthPercent: number;
}>('APPLY_DELTA_TO_WIDTH');

export const createTimeline = actionCreator<{ id: string; show?: boolean }>('CREATE_TIMELINE');

export const pinEvent = actionCreator<{ id: string; eventId: string }>('PIN_EVENT');

export const removeProvider = actionCreator<{ id: string; providerId: string }>('REMOVE_PROVIDER');

export const showTimeline = actionCreator<{ id: string; show: boolean }>('SHOW_TIMELINE');

export const unPinEvent = actionCreator<{ id: string; eventId: string }>('UN_PIN_EVENT');

export const updateDataProviderEnabled = actionCreator<{
  id: string;
  enabled: boolean;
  providerId: string;
}>('TOGGLE_PROVIDER_ENABLED');

export const updateDataProviderExcluded = actionCreator<{
  id: string;
  excluded: boolean;
  providerId: string;
}>('TOGGLE_PROVIDER_EXCLUDED');

export const updateDataProviderKqlQuery = actionCreator<{
  id: string;
  kqlQuery: string;
  providerId: string;
}>('PROVIDER_EDIT_KQL_QUERY');

export const updateHighlightedDropAndProviderId = actionCreator<{
  id: string;
  providerId: string;
}>('UPDATE_DROP_AND_PROVIDER');

export const updateDescription = actionCreator<{ id: string; description: string }>(
  'UPDATE_DESCRIPTION'
);

export const updateKqlMode = actionCreator<{ id: string; kqlMode: KqlMode }>('UPDATE_KQL_MODE');

export const updateKqlQuery = actionCreator<{ id: string; kqlQuery: string }>('UPDATE_KQL_QUERY');

export const updateIsFavorite = actionCreator<{ id: string; isFavorite: boolean }>(
  'UPDATE_IS_FAVORITE'
);

export const updateIsLive = actionCreator<{ id: string; isLive: boolean }>('UPDATE_IS_LIVE');

export const updateItemsPerPage = actionCreator<{ id: string; itemsPerPage: number }>(
  'UPDATE_ITEMS_PER_PAGE'
);

export const updateItemsPerPageOptions = actionCreator<{
  id: string;
  itemsPerPageOptions: number[];
}>('UPDATE_ITEMS_PER_PAGE_OPTIONS');

export const updateTitle = actionCreator<{ id: string; title: string }>('UPDATE_TITLE');

export const updatePageIndex = actionCreator<{ id: string; activePage: number }>(
  'UPDATE_PAGE_INDEX'
);

export const updateProviders = actionCreator<{ id: string; providers: DataProvider[] }>(
  'UPDATE_PROVIDERS'
);

export const updateRange = actionCreator<{ id: string; range: string }>('UPDATE_RANGE');

export const updateSort = actionCreator<{ id: string; sort: Sort }>('UPDATE_SORT');
