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
        from: '2022-12-14T00:00:00.000Z',
        to: '2022-12-14T23:59:59.999Z',
        indexFieldName: 'event.category',
        allowedValues: [{ name: 'process' }],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "aggregations": Object {
          "unallowedValues": Object {
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
              Object {
                "range": Object {
                  "@timestamp": Object {
                    "gte": "2022-12-14T00:00:00.000Z",
                    "lte": "2022-12-14T23:59:59.999Z",
                  },
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
        from: '2022-12-14T00:00:00.000Z',
        to: '2022-12-14T23:59:59.999Z',
        indexFieldName: 'event.category',
        allowedValues: [],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "aggregations": Object {
          "unallowedValues": Object {
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
              Object {
                "range": Object {
                  "@timestamp": Object {
                    "gte": "2022-12-14T00:00:00.000Z",
                    "lte": "2022-12-14T23:59:59.999Z",
                  },
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
