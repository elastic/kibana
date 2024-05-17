/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkDns } from '.';
import {
  formattedSearchStrategyResponse,
  mockOptions,
  mockSearchStrategyResponse,
} from './__mocks__';
import * as buildQuery from './query.dns_network.dsl';

describe('networkDns search strategy', () => {
  const mockBuildDnsQuery = jest.spyOn(buildQuery, 'buildDnsQuery');

  afterEach(() => {
    mockBuildDnsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkDns.buildDsl(mockOptions);
      expect(mockBuildDnsQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkDns.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
