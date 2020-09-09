/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';

import { HostAuthenticationsRequestOptions } from '../../../../../../common/search_strategy/security_solution/hosts/authentications';
import * as buildQuery from './dsl/query.dsl';
import { authentications } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

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
      } as HostAuthenticationsRequestOptions;

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
