/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectedDsl, mockOptions } from './__mocks__';
import { buildOverviewNetworkQuery } from './query.overview_network.dsl';

describe('buildOverviewNetworkQuery', () => {
  test('build query from options correctly', () => {
    expect(buildOverviewNetworkQuery(mockOptions)).toMatchObject(expectedDsl);
  });
});
