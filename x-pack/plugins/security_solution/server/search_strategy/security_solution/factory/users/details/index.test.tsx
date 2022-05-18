/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as buildQuery from './query.user_details.dsl';
import { userDetails } from '.';
import { mockOptions, mockSearchStrategyResponse } from './__mocks__';

describe('userDetails search strategy', () => {
  const buildHostDetailsQuery = jest.spyOn(buildQuery, 'buildUserDetailsQuery');

  afterEach(() => {
    buildHostDetailsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      userDetails.buildDsl(mockOptions);
      expect(buildHostDetailsQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await userDetails.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchSnapshot();
    });
  });
});
