/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  createExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { getCreateExceptionListItemOptionsMock } from '../exception_list_client.mock';

import { validateData } from './validate_data';
import { DataValidationError } from './errors';

import { transformCreateExceptionListItemOptionsToCreateExceptionListItemSchema } from './index';

describe('when using `validateData()` utility', () => {
  let data: CreateExceptionListItemSchema;

  beforeEach(() => {
    data = transformCreateExceptionListItemOptionsToCreateExceptionListItemSchema(
      getCreateExceptionListItemOptionsMock()
    );
  });

  it('should return `undefined` if data is valid', () => {
    expect(validateData(createExceptionListItemSchema, data)).toBeUndefined();
  });

  it('should return an `DataValidationError` if validation failed', () => {
    const { entries, ...modifiedData } = data;

    modifiedData.list_id = '';
    expect(entries).toBeTruthy(); // Avoid linting error

    const validationResult = validateData(
      createExceptionListItemSchema,
      modifiedData as CreateExceptionListItemSchema
    );

    expect(validationResult).toBeInstanceOf(DataValidationError);
    expect(validationResult?.reason).toEqual([
      'Invalid value "undefined" supplied to "entries"',
      'Invalid value "" supplied to "list_id"',
    ]);
  });
});
