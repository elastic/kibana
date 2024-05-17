/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkUsers } from '.';
import type { NetworkUsersRequestOptions } from '../../../../../../common/api/search_strategy';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import {
  formattedSearchStrategyResponse,
  mockOptions,
  mockSearchStrategyResponse,
} from './__mocks__';
import * as buildQuery from './query.users_network.dsl';

describe('networkUsers search strategy', () => {
  const buildUsersQuery = jest.spyOn(buildQuery, 'buildUsersQuery');

  afterEach(() => {
    buildUsersQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkUsers.buildDsl(mockOptions);
      expect(buildUsersQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should throw error if query size is greater equal than DEFAULT_MAX_TABLE_QUERY_SIZE ', () => {
      const overSizeOptions = {
        ...mockOptions,
        pagination: {
          ...mockOptions.pagination,
          querySize: DEFAULT_MAX_TABLE_QUERY_SIZE,
        },
      } as NetworkUsersRequestOptions;

      expect(() => {
        networkUsers.buildDsl(overSizeOptions);
      }).toThrowError(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkUsers.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
