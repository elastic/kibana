/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQuery } from './utils';

describe('getESQuery', () => {
  it('should stringify and format the query correctly', () => {
    const query = {
      query: {
        bool: {
          should: [
            {
              match: {
                field: '{query}',
              },
            },
            {
              match: {
                field: '{query}',
              },
            },
          ],
        },
      },
    };
    const expectedResult = `{
  "query": {
    "match": {
      "field": query
    }
  }
}`;
    expect(getESQuery(query)).toEqual(expectedResult);
  });

  it('should handle invalid input gracefully', () => {
    // Test when invalid input is provided
    const invalidQuery = 'not a valid query';
    // In this case, since the input is invalid, it should return an empty object
    expect(getESQuery(invalidQuery)).toEqual('{}');
  });

  it('should handle empty input gracefully', () => {
    // Test when empty input is provided
    const emptyQuery = {};
    // In this case, since the input is empty, it should return an empty object
    expect(getESQuery(emptyQuery)).toEqual('{}');
  });
});
