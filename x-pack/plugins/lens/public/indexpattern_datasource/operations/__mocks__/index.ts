/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const actualOperations = jest.requireActual('../operations');
const actualHelpers = jest.requireActual('../layer_helpers');
const actualTimeScaleUtils = jest.requireActual('../time_scale_utils');
const actualMocks = jest.requireActual('../mocks');

jest.spyOn(actualOperations.operationDefinitionMap.date_histogram, 'paramEditor');
jest.spyOn(actualOperations.operationDefinitionMap.terms, 'onOtherColumnChanged');
jest.spyOn(actualHelpers, 'insertOrReplaceColumn');
jest.spyOn(actualHelpers, 'insertNewColumn');
jest.spyOn(actualHelpers, 'replaceColumn');
jest.spyOn(actualHelpers, 'getErrorMessages');

export const {
  getAvailableOperationsByMetadata,
  getOperations,
  getOperationDisplay,
  getOperationTypesForField,
  getOperationResultType,
  operationDefinitionMap,
  operationDefinitions,
  getInvalidFieldMessage,
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
  getErrorMessages,
  isReferenced,
  resetIncomplete,
  isOperationAllowedAsReference,
  canTransition,
} = actualHelpers;

export const { adjustTimeScaleLabelSuffix, DEFAULT_TIME_SCALE } = actualTimeScaleUtils;

export const { createMockedReferenceOperation } = actualMocks;
