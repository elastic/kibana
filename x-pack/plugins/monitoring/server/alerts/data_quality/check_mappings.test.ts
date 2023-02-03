/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkMappings } from './check_mappings';

describe('checkMappings()', () => {
  it('should return invalid fields list', () => {
    expect(
      checkMappings(
        {
          logs: {
            mappings: {
              properties: {
                event: {
                  properties: {
                    category: {
                      type: 'string',
                    } as any,
                  },
                },
              },
            },
          },
        },
        'logs'
      )
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "correctType": "keyword",
          "currentType": "string",
          "field": "event.category",
          "index": "logs",
        },
      ]
    `);
  });
});
