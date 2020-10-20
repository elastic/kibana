/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as buildQuery from './query.last_first_seen_host.dsl';
import { firstLastSeenHost } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

describe('firstLastSeenHost search strategy', () => {
  const buildFirstLastSeenHostQuery = jest.spyOn(buildQuery, 'buildFirstLastSeenHostQuery');

  afterEach(() => {
    buildFirstLastSeenHostQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      firstLastSeenHost.buildDsl(mockOptions);
      expect(buildFirstLastSeenHostQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await firstLastSeenHost.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
