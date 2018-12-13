/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';
import actionCreatorFactory from 'typescript-fsa';

const actionCreator = actionCreatorFactory('x-pack/secops/local/inputs');

export const setRangeDatePicker = actionCreator<{
  id: string;
  from: Moment;
  to: Moment;
  type: string;
}>('UPDATE_RANGE_DATE_PICKER');

export const setInterval = actionCreator<{ id: string; interval: number; intervalType: string }>(
  'SET_INTERVAL'
);

export const startAutoReload = actionCreator<{ id: string }>('START_KQL_AUTO_RELOAD');

export const stopAutoReload = actionCreator<{ id: string }>('STOP_KQL_AUTO_RELOAD');
