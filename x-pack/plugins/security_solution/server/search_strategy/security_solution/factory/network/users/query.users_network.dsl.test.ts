/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildUsersQuery } from './query.users_network.dsl';
import { mockOptions, expectedDsl } from './__mocks__';

describe('buildUsersQuery', () => {
  test('build query from options correctly', () => {
    expect(buildUsersQuery(mockOptions)).toEqual(expectedDsl);
  });
});
