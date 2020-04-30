/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { State } from '../reducer';

import { IdToDataProvider } from './model';

const selectDataProviders = (state: State): IdToDataProvider => state.dragAndDrop.dataProviders;

export const dataProvidersSelector = createSelector(
  selectDataProviders,
  dataProviders => dataProviders
);
