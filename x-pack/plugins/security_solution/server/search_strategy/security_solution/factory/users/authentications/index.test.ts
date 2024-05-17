/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';

import { authentications } from '.';
import type { UserAuthenticationsRequestOptions } from '../../../../../../common/api/search_strategy';
import {
  formattedSearchStrategyResponse,
  mockOptions,
  mockSearchStrategyResponse,
} from './__mocks__';
import * as buildQuery from './dsl/query.dsl';

describe('authentications search strategy', () => {
  const buildAuthenticationQuery = jest.spyOn(buildQuery, 'buildQuery');

  afterEach(() => {
    buildAuthenticationQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      authentications.buildDsl(mockOptions);
      expect(buildAuthenticationQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should throw error if query size is greater equal than DEFAULT_MAX_TABLE_QUERY_SIZE ', () => {
      const overSizeOptions = {
        ...mockOptions,
        pagination: {
          ...mockOptions.pagination,
          querySize: DEFAULT_MAX_TABLE_QUERY_SIZE,
        },
      } as UserAuthenticationsRequestOptions;

      expect(() => {
        authentications.buildDsl(overSizeOptions);
      }).toThrowError(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await authentications.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
