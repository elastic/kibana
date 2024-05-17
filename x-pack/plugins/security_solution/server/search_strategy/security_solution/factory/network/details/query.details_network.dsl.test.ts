/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectedDsl, mockOptions } from './__mocks__';
import { buildNetworkDetailsQuery } from './query.details_network.dsl';

describe('buildNetworkDetailsQuery', () => {
  test('build query from options correctly', () => {
    expect(buildNetworkDetailsQuery(mockOptions)).toEqual(expectedDsl);
  });
});
