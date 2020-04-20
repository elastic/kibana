/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildRouteValidation } from './route_validation';
import * as rt from 'io-ts';
import { RouteValidationResultFactory } from '../../../../../../src/core/server/http';

describe('buildRouteValidation', () => {
  const schema = rt.type({
    ids: rt.array(rt.string),
  });
  const validationResult: RouteValidationResultFactory = {
    ok: jest.fn().mockImplementation(validatedInput => validatedInput),
    badRequest: jest.fn().mockImplementation(e => e),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('return validation error', () => {
    const input = { id: 'someId' };
    const result = buildRouteValidation(schema)(input, validationResult);

    expect(result).toEqual(
      'Invalid value undefined supplied to : { ids: Array<string> }/ids: Array<string>'
    );
  });

  test('return validated input', () => {
    const input = { ids: ['someId'] };
    const result = buildRouteValidation(schema)(input, validationResult);

    expect(result).toEqual(input);
  });
});
