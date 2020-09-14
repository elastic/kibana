/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { exactCheck } from '../../../exact_check';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { eqlValidationSchema, EqlValidationSchemaDecoded } from './eql_validation_schema';
import { getEqlValidationSchemaMock } from './eql_validation_schema.mock';

describe('EQL validation schema', () => {
  it('requires a value for index', () => {
    const payload = {
      ...getEqlValidationSchemaMock(),
      index: undefined,
    };
    const decoded = eqlValidationSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "index"',
    ]);
    expect(message.schema).toEqual({});
  });

  it('requires a value for query', () => {
    const payload = {
      ...getEqlValidationSchemaMock(),
      query: undefined,
    };
    const decoded = eqlValidationSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "query"',
    ]);
    expect(message.schema).toEqual({});
  });

  it('validates a payload with index and query', () => {
    const payload = getEqlValidationSchemaMock();
    const decoded = eqlValidationSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected: EqlValidationSchemaDecoded = {
      index: ['index-123'],
      query: 'process where process.name == "regsvr32.exe"',
    };

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });
});
