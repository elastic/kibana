/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left, right } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

import { validate, validateEither } from './validate';

describe('validate', () => {
  test('it should do a validation correctly', () => {
    const schema = t.exact(t.type({ a: t.number }));
    const payload = { a: 1 };
    const [validated, errors] = validate(payload, schema);

    expect(validated).toEqual(payload);
    expect(errors).toEqual(null);
  });

  test('it should do an in-validation correctly', () => {
    const schema = t.exact(t.type({ a: t.number }));
    const payload = { a: 'some other value' };
    const [validated, errors] = validate(payload, schema);

    expect(validated).toEqual(null);
    expect(errors).toEqual('Invalid value "some other value" supplied to "a"');
  });
});

describe('validateEither', () => {
  it('returns the ORIGINAL payload as right if valid', () => {
    const schema = t.exact(t.type({ a: t.number }));
    const payload = { a: 1 };
    const result = validateEither(schema, payload);

    expect(result).toEqual(right(payload));
  });

  it('returns an error string if invalid', () => {
    const schema = t.exact(t.type({ a: t.number }));
    const payload = { a: 'some other value' };
    const result = validateEither(schema, payload);

    expect(result).toEqual(left(new Error('Invalid value "some other value" supplied to "a"')));
  });
});
