/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';

import { HostsRequestOptions } from '../../../../../../common/search_strategy/security_solution';
import * as buildQuery from './query.all_hosts.dsl';
import { allHosts } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

describe('allHosts search strategy', () => {
  const buildAllHostsQuery = jest.spyOn(buildQuery, 'buildHostsQuery');

  afterEach(() => {
    buildAllHostsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      allHosts.buildDsl(mockOptions);
      expect(buildAllHostsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should throw error if query size is greater equal than DEFAULT_MAX_TABLE_QUERY_SIZE ', () => {
      const overSizeOptions = {
        ...mockOptions,
        pagination: {
          ...mockOptions.pagination,
          querySize: DEFAULT_MAX_TABLE_QUERY_SIZE,
        },
      } as HostsRequestOptions;

      expect(() => {
        allHosts.buildDsl(overSizeOptions);
      }).toThrowError(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await allHosts.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
