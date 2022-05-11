/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';

import * as buildQuery from './query.all_users.dsl';
import { allUsers } from '.';
import { mockOptions, mockSearchStrategyResponse } from './__mocks__';
import { UsersRequestOptions } from '../../../../../../common/search_strategy/security_solution/users/all';

describe('allHosts search strategy', () => {
  const buildAllHostsQuery = jest.spyOn(buildQuery, 'buildUsersQuery');

  afterEach(() => {
    buildAllHostsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      allUsers.buildDsl(mockOptions);
      expect(buildAllHostsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should throw error if query size is greater equal than DEFAULT_MAX_TABLE_QUERY_SIZE ', () => {
      const overSizeOptions = {
        ...mockOptions,
        pagination: {
          ...mockOptions.pagination,
          querySize: DEFAULT_MAX_TABLE_QUERY_SIZE,
        },
      } as UsersRequestOptions;

      expect(() => {
        allUsers.buildDsl(overSizeOptions);
      }).toThrowError(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await allUsers.parse(mockOptions, mockSearchStrategyResponse);
      expect(result.users).toMatchSnapshot();
      expect(result.totalCount).toMatchSnapshot();
      expect(result.pageInfo).toMatchSnapshot();
    });
  });
});
