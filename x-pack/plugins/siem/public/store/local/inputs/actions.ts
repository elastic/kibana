/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { Refetch } from './model';

const actionCreator = actionCreatorFactory('x-pack/siem/local/inputs');

export const setAbsoluteRangeDatePicker = actionCreator<{
  id: string;
  from: number;
  to: number;
}>('SET_ABSOLUTE_RANGE_DATE_PICKER');

export const setRelativeRangeDatePicker = actionCreator<{
  id: string;
  option: string;
  from: number;
  to: number;
}>('SET_RELATIVE_RANGE_DATE_PICKER');

export const setDuration = actionCreator<{ id: string; duration: number }>('SET_DURATION');

export const startAutoReload = actionCreator<{ id: string }>('START_KQL_AUTO_RELOAD');

export const stopAutoReload = actionCreator<{ id: string }>('STOP_KQL_AUTO_RELOAD');

export const setQuery = actionCreator<{ id: string; loading: boolean; refetch: Refetch }>(
  'SET_QUERY'
);
