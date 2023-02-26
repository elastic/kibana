/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMSearchRequestBody, getMSearchRequestHeader } from './get_unallowed_field_requests';

describe('getMSearchRequest', () => {
  test('getMSearchRequestHeader', () => {
    expect(getMSearchRequestHeader('auditbeat')).toMatchInlineSnapshot(`
      Object {
        "expand_wildcards": Array [
          "open",
        ],
        "index": "auditbeat",
      }
    `);
  });

  test('getMSearchRequestBody', () => {
    expect(
      getMSearchRequestBody({
        indexName: 'auditbeat',
        indexFieldName: 'event.category',
        allowedValues: ['process'],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "aggregations": Object {
          "event.category": Object {
            "terms": Object {
              "field": "event.category",
              "order": Object {
                "_count": "desc",
              },
            },
          },
        },
        "query": Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "filter": Array [],
                  "must": Array [],
                  "must_not": Array [
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "should": Array [
                          Object {
                            "match_phrase": Object {
                              "event.category": "process",
                            },
                          },
                        ],
                      },
                    },
                  ],
                  "should": Array [],
                },
              },
            ],
          },
        },
        "runtime_mappings": Object {},
        "size": 0,
      }
    `);
  });

  test('getMSearchRequestBody - without allowedValues', () => {
    expect(
      getMSearchRequestBody({
        indexName: 'auditbeat',
        indexFieldName: 'event.category',
        allowedValues: [],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "aggregations": Object {
          "event.category": Object {
            "terms": Object {
              "field": "event.category",
              "order": Object {
                "_count": "desc",
              },
            },
          },
        },
        "query": Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "filter": Array [],
                  "must": Array [],
                  "must_not": Array [],
                  "should": Array [],
                },
              },
            ],
          },
        },
        "runtime_mappings": Object {},
        "size": 0,
      }
    `);
  });
});
