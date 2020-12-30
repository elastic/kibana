/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { buildFirstLastSeenHostQuery as buildQuery } from './query.last_first_seen_host.dsl';
import { mockOptions, expectedDsl } from './__mocks__';

describe('buildQuery', () => {
  test('build query from options correctly', () => {
    expect(buildQuery(mockOptions)).toEqual(expectedDsl);
  });
});
