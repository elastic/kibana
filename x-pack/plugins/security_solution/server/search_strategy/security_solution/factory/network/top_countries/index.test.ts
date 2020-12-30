/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as buildQuery from './query.top_countries_network.dsl';
import { networkTopCountries } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

describe('networkTopCountries search strategy', () => {
  const buildTopCountriesQuery = jest.spyOn(buildQuery, 'buildTopCountriesQuery');

  afterEach(() => {
    buildTopCountriesQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkTopCountries.buildDsl(mockOptions);
      expect(buildTopCountriesQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkTopCountries.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
