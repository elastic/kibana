/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';

import * as buildQuery from './query.all_users.dsl';
import { allUsers } from '.';
import { mockDeps, mockOptions, mockSearchStrategyResponse } from './__mocks__';
import * as buildRiskQuery from '../../risk_score/all/query.risk_score.dsl';

import { get } from 'lodash/fp';
import { RiskScoreEntity } from '../../../../../../common/search_strategy';
import type { UsersRequestOptions } from '../../../../../../common/api/search_strategy';

class IndexNotFoundException extends Error {
  meta: { body: { error: { type: string } } };

  constructor() {
    super();
    this.meta = { body: { error: { type: 'index_not_found_exception' } } };
  }
}

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

    test('should enhance data with risk score', async () => {
      const risk = 'TEST_RISK_SCORE';
      const userName: string = get(
        `aggregations.user_data.buckets[0].domain.hits.hits[0].fields['user.name']`,
        mockSearchStrategyResponse.rawResponse
      );

      const mockedDeps = mockDeps();

      mockedDeps.esClient.asCurrentUser.search.mockResponse({
        hits: {
          hits: [
            // @ts-expect-error incomplete type
            {
              _source: {
                risk,
                user: {
                  name: userName,
                  risk: {
                    multipliers: [],
                    calculated_score_norm: 9999,
                    calculated_level: risk,
                    rule_risks: [],
                  },
                },
              },
            },
          ],
        },
      });

      const result = await allUsers.parse(mockOptions, mockSearchStrategyResponse, mockedDeps);

      expect(result.users[0].risk).toBe(risk);
    });

    test('should query host risk only for hostNames in the current page', async () => {
      const buildHostsRiskQuery = jest.spyOn(buildRiskQuery, 'buildRiskScoreQuery');
      const mockedDeps = mockDeps();
      // @ts-expect-error incomplete type
      mockedDeps.esClient.asCurrentUser.search.mockResponse({ hits: { hits: [] } });

      const userName: string = get(
        `aggregations.user_data.buckets[1].domain.hits.hits[0].fields['user.name']`,
        mockSearchStrategyResponse.rawResponse
      );

      // 2 pages with one item on each
      const pagination = { activePage: 1, cursorStart: 1, fakePossibleCount: 5, querySize: 2 };

      await allUsers.parse({ ...mockOptions, pagination }, mockSearchStrategyResponse, mockedDeps);

      expect(buildHostsRiskQuery).toHaveBeenCalledWith({
        defaultIndex: ['risk-score.risk-score-latest-test-space'],
        filterQuery: { terms: { 'user.name': userName } },
        riskScoreEntity: RiskScoreEntity.user,
        factoryQueryType: 'usersRiskScore',
      });
    });

    test("should not enhance data when index doesn't exist", async () => {
      const mockedDeps = mockDeps();
      mockedDeps.esClient.asCurrentUser.search.mockImplementation(() => {
        throw new IndexNotFoundException();
      });

      const result = await allUsers.parse(mockOptions, mockSearchStrategyResponse, mockedDeps);

      expect(result.users[0].risk).toBeUndefined();
    });
  });
});
