/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as buildQuery from './query.overview_host.dsl';
import { hostOverview } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

describe('hostOverview search strategy', () => {
  const buildOverviewHostQuery = jest.spyOn(buildQuery, 'buildOverviewHostQuery');

  afterEach(() => {
    buildOverviewHostQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      hostOverview.buildDsl(mockOptions);
      expect(buildOverviewHostQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await hostOverview.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
