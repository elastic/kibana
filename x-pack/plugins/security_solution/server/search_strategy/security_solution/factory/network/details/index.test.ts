/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkDetails } from '.';
import {
  formattedSearchStrategyResponse,
  mockOptions,
  mockSearchStrategyResponse,
} from './__mocks__';
import * as buildQuery from './query.details_network.dsl';

describe('networkDetails search strategy', () => {
  const buildNetworkDetailsQuery = jest.spyOn(buildQuery, 'buildNetworkDetailsQuery');

  afterEach(() => {
    buildNetworkDetailsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkDetails.buildDsl(mockOptions);
      expect(buildNetworkDetailsQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkDetails.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toEqual(formattedSearchStrategyResponse);
    });
  });
});
