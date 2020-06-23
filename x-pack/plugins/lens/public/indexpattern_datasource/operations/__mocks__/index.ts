/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const actual = jest.requireActual('../../operations');

jest.spyOn(actual.operationDefinitionMap.date_histogram, 'paramEditor');
jest.spyOn(actual.operationDefinitionMap.terms, 'onOtherColumnChanged');

export const {
  getAvailableOperationsByMetadata,
  buildColumn,
  getOperations,
  getOperationDisplay,
  getOperationTypesForField,
  getOperationResultType,
  operationDefinitionMap,
  operationDefinitions,
  isColumnTransferable,
  changeField,
} = actual;
