/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagValidation } from '../../common/validation';
import { TagValidationError } from './errors';

const createValidation = (errors: TagValidation['errors'] = {}): TagValidation => ({
  valid: Object.keys(errors).length === 0,
  warnings: [],
  errors,
});

describe('TagValidationError', () => {
  it('is assignable to its instances', () => {
    // this test is here to ensure the `Object.setPrototypeOf` constructor workaround for TS is not removed.
    const error = new TagValidationError('validation error', createValidation());

    expect(error instanceof TagValidationError).toBe(true);
  });

  it('allow access to the underlying validation', () => {
    const validation = createValidation();

    const error = new TagValidationError('validation error', createValidation());

    expect(error.validation).toStrictEqual(validation);
  });
});
