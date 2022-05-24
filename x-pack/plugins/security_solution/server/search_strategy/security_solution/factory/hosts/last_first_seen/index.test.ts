/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// this file would need to be updated further along with mock data file names
import * as buildQuery from './query.first_or_last_seen_host.dsl';
import { firstOrLastSeen } from '.';
import {
  mockOptions,
  mockSearchStrategyFirstSeenResponse,
  mockSearchStrategyLastSeenResponse,
  formattedSearchStrategyLastResponse,
  formattedSearchStrategyFirstResponse,
} from './__mocks__';
import { Direction, FirstLastSeenRequestOptions } from '../../../../../../common/search_strategy';

describe('firstLastSeenHost search strategy', () => {
  describe('first seen search strategy', () => {
    const buildFirstLastSeenHostQuery = jest.spyOn(buildQuery, 'buildFirstOrLastSeenQuery');

    afterEach(() => {
      buildFirstLastSeenHostQuery.mockClear();
    });

    describe('buildDsl', () => {
      test('should build dsl query', () => {
        firstOrLastSeen.buildDsl(mockOptions);
        expect(buildFirstLastSeenHostQuery).toHaveBeenCalledWith(mockOptions);
      });
    });

    describe('parse', () => {
      test('should parse data correctly', async () => {
        const result = await firstOrLastSeen.parse(
          mockOptions,
          mockSearchStrategyFirstSeenResponse
        );
        expect(result).toMatchObject(formattedSearchStrategyFirstResponse);
      });
    });
  });

  describe('last seen search strategy', () => {
    const buildFirstLastSeenHostQuery = jest.spyOn(buildQuery, 'buildFirstOrLastSeenQuery');

    afterEach(() => {
      buildFirstLastSeenHostQuery.mockClear();
    });

    describe('buildDsl', () => {
      test('should build dsl query', () => {
        const options: FirstLastSeenRequestOptions = { ...mockOptions, order: Direction.desc };
        firstOrLastSeen.buildDsl(options);
        expect(buildFirstLastSeenHostQuery).toHaveBeenCalledWith(options);
      });
    });

    describe('parse', () => {
      test('should parse data correctly', async () => {
        const result = await firstOrLastSeen.parse(
          { ...mockOptions, order: Direction.desc },
          mockSearchStrategyLastSeenResponse
        );
        expect(result).toMatchObject(formattedSearchStrategyLastResponse);
      });
    });
  });
});
