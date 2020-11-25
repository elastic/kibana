/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const actualOperations = jest.requireActual('../operations');
const actualHelpers = jest.requireActual('../layer_helpers');

jest.spyOn(actualOperations.operationDefinitionMap.date_histogram, 'paramEditor');
jest.spyOn(actualOperations.operationDefinitionMap.terms, 'onOtherColumnChanged');
jest.spyOn(actualHelpers, 'insertOrReplaceColumn');
jest.spyOn(actualHelpers, 'insertNewColumn');
jest.spyOn(actualHelpers, 'replaceColumn');

export const {
  getAvailableOperationsByMetadata,
  getOperations,
  getOperationDisplay,
  getOperationTypesForField,
  getOperationResultType,
  operationDefinitionMap,
  operationDefinitions,
} = actualOperations;

export const {
  insertOrReplaceColumn,
  insertNewColumn,
  replaceColumn,
  getColumnOrder,
  deleteColumn,
  updateColumnParam,
  sortByField,
  hasField,
  updateLayerIndexPattern,
  mergeLayer,
  isColumnTransferable,
} = actualHelpers;
