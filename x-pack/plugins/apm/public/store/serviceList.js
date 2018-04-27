/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rest from '../services/rest';
import orderBy from 'lodash.orderby';
import { createSelector } from 'reselect';
import { createActionTypes, createAction, createReducer } from './apiHelpers';

const actionTypes = createActionTypes('SERVICE_LIST');
export const [
  SERVICE_LIST_LOADING,
  SERVICE_LIST_SUCCESS,
  SERVICE_LIST_FAILURE
] = actionTypes;

const INITIAL_DATA = [];

const serviceList = createReducer(actionTypes, INITIAL_DATA);

export const loadServiceList = createAction(actionTypes, rest.loadServiceList);

// SELECTORS
export const getServiceList = createSelector(
  state => state.serviceList,
  state => state.sorting.service,
  (serviceList, serviceSorting) => {
    const { key: sortKey, descending } = serviceSorting;

    return {
      ...serviceList,
      data: orderBy(serviceList.data, sortKey, descending ? 'desc' : 'asc')
    };
  }
);

export default serviceList;
