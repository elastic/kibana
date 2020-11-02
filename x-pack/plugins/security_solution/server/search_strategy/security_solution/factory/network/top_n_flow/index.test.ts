/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as buildQuery from './query.top_n_flow_network.dsl';
import { networkTopNFlow } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

describe('networkTopNFlow search strategy', () => {
  const buildTopNFlowQuery = jest.spyOn(buildQuery, 'buildTopNFlowQuery');

  afterEach(() => {
    buildTopNFlowQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkTopNFlow.buildDsl(mockOptions);
      expect(buildTopNFlowQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkTopNFlow.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
