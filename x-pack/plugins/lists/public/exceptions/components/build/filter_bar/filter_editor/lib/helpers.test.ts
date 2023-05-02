/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';

import { getFieldValidityAndErrorMessage } from './helpers';

const mockField = {
  type: 'date',
} as DataViewField;

describe('Check field validity and error message', () => {
  it('should return a message that the entered date is not incorrect', () => {
    const output = getFieldValidityAndErrorMessage(mockField, Date());

    expect(output).toEqual({
      isInvalid: false,
    });
  });

  it('should show error', () => {
    const output = getFieldValidityAndErrorMessage(mockField, 'Date');

    expect(output).toEqual({
      isInvalid: true,
      errorMessage: 'Invalid date format provided',
    });
  });
});
