/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectedDsl, mockOptions } from './__mocks__';
import { buildFirstOrLastSeenQuery as buildQuery } from './query.first_or_last_seen.dsl';

describe('buildQuery', () => {
  test('build query from options correctly', () => {
    expect(buildQuery(mockOptions)).toEqual(expectedDsl);
  });
});
