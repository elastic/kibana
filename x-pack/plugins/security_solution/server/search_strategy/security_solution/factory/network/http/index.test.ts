/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkHttp } from '.';
import {
  formattedSearchStrategyResponse,
  mockOptions,
  mockSearchStrategyResponse,
} from './__mocks__';
import * as buildQuery from './query.http_network.dsl';

describe('networkHttp search strategy', () => {
  const buildHttpQuery = jest.spyOn(buildQuery, 'buildHttpQuery');

  afterEach(() => {
    buildHttpQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkHttp.buildDsl(mockOptions);
      expect(buildHttpQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkHttp.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
