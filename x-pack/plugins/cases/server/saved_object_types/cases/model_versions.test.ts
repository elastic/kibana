/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelVersion1 } from './model_versions';

describe('Model versions', () => {
  describe('1', () => {
    it('returns the model version correctly', () => {
      expect(modelVersion1.changes).toMatchInlineSnapshot(`
        Array [
          Object {
            "addedMappings": Object {
              "customFields": Object {
                "properties": Object {
                  "key": Object {
                    "type": "keyword",
                  },
                  "type": Object {
                    "type": "keyword",
                  },
                  "value": Object {
                    "fields": Object {
                      "boolean": Object {
                        "ignore_malformed": true,
                        "type": "boolean",
                      },
                      "date": Object {
                        "ignore_malformed": true,
                        "type": "date",
                      },
                      "ip": Object {
                        "ignore_malformed": true,
                        "type": "ip",
                      },
                      "number": Object {
                        "ignore_malformed": true,
                        "type": "long",
                      },
                      "string": Object {
                        "type": "text",
                      },
                    },
                    "type": "keyword",
                  },
                },
                "type": "nested",
              },
            },
            "type": "mappings_addition",
          },
        ]
      `);
    });
  });
});
