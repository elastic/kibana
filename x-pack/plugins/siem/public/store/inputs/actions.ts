/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { InputsModelId, Refetch } from './model';

const actionCreator = actionCreatorFactory('x-pack/siem/local/inputs');

export const setAbsoluteRangeDatePicker = actionCreator<{
  id: InputsModelId;
  from: number;
  to: number;
}>('SET_ABSOLUTE_RANGE_DATE_PICKER');

export const setRelativeRangeDatePicker = actionCreator<{
  id: InputsModelId;
  fromStr: string;
  toStr: string;
  from: number;
  to: number;
}>('SET_RELATIVE_RANGE_DATE_PICKER');

export const setDuration = actionCreator<{ id: InputsModelId; duration: number }>('SET_DURATION');

export const startAutoReload = actionCreator<{ id: InputsModelId }>('START_KQL_AUTO_RELOAD');

export const stopAutoReload = actionCreator<{ id: InputsModelId }>('STOP_KQL_AUTO_RELOAD');

export const setQuery = actionCreator<{
  inputId: InputsModelId;
  id: string;
  loading: boolean;
  refetch: Refetch;
}>('SET_QUERY');

export const deleteAllQuery = actionCreator<{ id: InputsModelId }>('DELETE_ALL_QUERY');

export const toggleTimelineLinkTo = actionCreator<{ linkToId: InputsModelId }>(
  'TOGGLE_TIMELINE_LINK_TO'
);
