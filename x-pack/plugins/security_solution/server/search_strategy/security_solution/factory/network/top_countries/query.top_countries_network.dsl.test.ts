/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectedDsl, mockOptions } from './__mocks__';
import { buildTopCountriesQuery } from './query.top_countries_network.dsl';

describe('buildTopCountriesQuery', () => {
  test('build query from options correctly', () => {
    expect(buildTopCountriesQuery(mockOptions)).toEqual(expectedDsl);
  });
});
