/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';

import type { Filter } from '@kbn/es-query';
import { InspectQuery, Refetch, RefetchKql } from './model';
import { InputsModelId } from './constants';

import type { SavedQuery } from '../../../../../../../src/plugins/data/public';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/inputs');

export const setAbsoluteRangeDatePicker = actionCreator<{
  id: InputsModelId;
  from: string;
  to: string;
  fromStr?: string;
  toStr?: string;
}>('SET_ABSOLUTE_RANGE_DATE_PICKER');

export const setTimelineRangeDatePicker = actionCreator<{
  from: string;
  to: string;
}>('SET_TIMELINE_RANGE_DATE_PICKER');

export const setRelativeRangeDatePicker = actionCreator<{
  id: InputsModelId;
  fromStr: string;
  toStr: string;
  from: string;
  to: string;
}>('SET_RELATIVE_RANGE_DATE_PICKER');

export const setDuration = actionCreator<{ id: InputsModelId; duration: number }>('SET_DURATION');

export const startAutoReload = actionCreator<{ id: InputsModelId }>('START_KQL_AUTO_RELOAD');

export const stopAutoReload = actionCreator<{ id: InputsModelId }>('STOP_KQL_AUTO_RELOAD');

export const setFullScreen = actionCreator<{
  id: InputsModelId;
  fullScreen: boolean;
}>('SET_FULL_SCREEN');

export const setQuery = actionCreator<{
  inputId: InputsModelId;
  id: string;
  loading: boolean;
  refetch: Refetch | RefetchKql;
  inspect: InspectQuery | null;
}>('SET_QUERY');

export const deleteOneQuery = actionCreator<{
  inputId: InputsModelId;
  id: string;
}>('DELETE_QUERY');

export const setInspectionParameter = actionCreator<{
  id: string;
  inputId: InputsModelId;
  isInspected: boolean;
  selectedInspectIndex: number;
}>('SET_INSPECTION_PARAMETER');

export const deleteAllQuery = actionCreator<{ id: InputsModelId }>('DELETE_ALL_QUERY');

export const toggleTimelineLinkTo = actionCreator<{ linkToId: InputsModelId }>(
  'TOGGLE_TIMELINE_LINK_TO'
);

export const removeTimelineLinkTo = actionCreator('REMOVE_TIMELINE_LINK_TO');
export const addTimelineLinkTo = actionCreator<{ linkToId: InputsModelId }>('ADD_TIMELINE_LINK_TO');

export const removeGlobalLinkTo = actionCreator('REMOVE_GLOBAL_LINK_TO');
export const addGlobalLinkTo = actionCreator<{ linkToId: InputsModelId }>('ADD_GLOBAL_LINK_TO');

export const setFilterQuery = actionCreator<{
  id: InputsModelId;
  query: string | { [key: string]: unknown };
  language: string;
}>('SET_FILTER_QUERY');

export const setSavedQuery = actionCreator<{
  id: InputsModelId;
  savedQuery: SavedQuery | undefined;
}>('SET_SAVED_QUERY');

export const setSearchBarFilter = actionCreator<{
  id: InputsModelId;
  filters: Filter[];
}>('SET_SEARCH_BAR_FILTER');
