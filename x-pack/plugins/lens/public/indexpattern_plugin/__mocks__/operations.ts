/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const actual = jest.requireActual('../operations');

jest.spyOn(actual, 'getPotentialColumns');
jest.spyOn(actual, 'getColumnOrder');

export const {
  getPotentialColumns,
  getColumnOrder,
  getOperations,
  getOperationDisplay,
  getOperationTypesForField,
  getOperationResultType,
} = actual;
