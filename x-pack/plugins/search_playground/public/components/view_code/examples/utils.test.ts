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
    expect(getESQuery(query)).toMatchInlineSnapshot(`
      "{
              \\"query\\": {
                  \\"bool\\": {
                      \\"should\\": [
                          {
                              \\"match\\": {
                                  \\"field\\": query
                              }
                          },
                          {
                              \\"match\\": {
                                  \\"field\\": query
                              }
                          }
                      ]
                  }
              }
          }"
    `);
  });
});
