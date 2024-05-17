/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkTls } from '.';
import {
  formattedSearchStrategyResponse,
  mockOptions,
  mockSearchStrategyResponse,
} from './__mocks__';
import * as buildQuery from './query.tls_network.dsl';

describe('networkTls search strategy', () => {
  const buildNetworkTlsQuery = jest.spyOn(buildQuery, 'buildNetworkTlsQuery');

  afterEach(() => {
    buildNetworkTlsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkTls.buildDsl(mockOptions);
      expect(buildNetworkTlsQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkTls.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
