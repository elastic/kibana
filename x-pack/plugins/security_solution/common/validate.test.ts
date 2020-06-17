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

import * as t from 'io-ts';

import { validate } from './validate';

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
