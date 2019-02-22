/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { dateScalar } from './resolvers';

describe('Test ScalarDate', () => {
  test('Make sure that a date is serialized', async () => {
    const date = dateScalar.serialize(1514782800000);
    expect(date.toString()).toEqual('2018-01-01T05:00:00.000Z');
  });
});
