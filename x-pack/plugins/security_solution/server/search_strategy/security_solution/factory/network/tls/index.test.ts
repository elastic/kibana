/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as buildQuery from './query.tls_network.dsl';
import { networkTls } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

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
