/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as buildQuery from './query.details_network.dsl';
import { networkDetails } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

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
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
