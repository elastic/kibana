/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { exactCheck } from '../../../exact_check';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { getEqlValidationResponseMock } from './eql_validation_schema.mock';
import { eqlValidationSchema } from './eql_validation_schema';

describe('EQL validation response schema', () => {
  it('validates a typical response', () => {
    const payload = getEqlValidationResponseMock();
    const decoded = eqlValidationSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getEqlValidationResponseMock());
  });

  it('invalidates a response with extra properties', () => {
    const payload = { ...getEqlValidationResponseMock(), extra: 'nope' };
    const decoded = eqlValidationSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extra"']);
    expect(message.schema).toEqual({});
  });

  it('invalidates a response with missing properties', () => {
    const payload = { ...getEqlValidationResponseMock(), valid: undefined };
    const decoded = eqlValidationSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "valid"',
    ]);
    expect(message.schema).toEqual({});
  });

  it('invalidates a response with properties of the wrong type', () => {
    const payload = { ...getEqlValidationResponseMock(), errors: 'should be an array' };
    const decoded = eqlValidationSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "should be an array" supplied to "errors"',
    ]);
    expect(message.schema).toEqual({});
  });
});
