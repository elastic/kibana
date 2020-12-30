/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as buildQuery from './query.overview_network.dsl';
import { networkOverview } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

describe('networkOverview search strategy', () => {
  const buildOverviewNetworkQuery = jest.spyOn(buildQuery, 'buildOverviewNetworkQuery');

  afterEach(() => {
    buildOverviewNetworkQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkOverview.buildDsl(mockOptions);
      expect(buildOverviewNetworkQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkOverview.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
