/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const actual = jest.requireActual('../state_helpers');

jest.spyOn(actual, 'changeColumn');
jest.spyOn(actual, 'updateLayerIndexPattern');

export const {
  getColumnOrder,
  changeColumn,
  deleteColumn,
  updateColumnParam,
  sortByField,
  hasField,
  updateLayerIndexPattern,
} = actual;
