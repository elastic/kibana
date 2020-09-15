/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { buildNetworkTlsQuery } from './query.tls_network.dsl';
import { mockOptions, expectedDsl } from './__mocks__';

describe('buildNetworkTlsQuery', () => {
  test('build query from options correctly', () => {
    expect(buildNetworkTlsQuery(mockOptions)).toEqual(expectedDsl);
  });
});
