/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDetailsPageFilter,
  getNetworkDetailsPageFilter,
  getRequestsAndResponses,
  parseVisualizationData,
} from './utils';
import { mockRequests } from './__mocks__/utils';

describe('getDetailsPageFilter', () => {
  test('should render host details filter', () => {
    expect(getDetailsPageFilter('hosts', 'mockHost')).toMatchInlineSnapshot(`
      Array [
        Object {
          "meta": Object {
            "alias": null,
            "disabled": false,
            "key": "host.name",
            "negate": false,
            "params": Object {
              "query": "mockHost",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "host.name": "mockHost",
            },
          },
        },
      ]
    `);
  });

  test('should render user details filter', () => {
    expect(getDetailsPageFilter('users', 'elastic')).toMatchInlineSnapshot(`
      Array [
        Object {
          "meta": Object {
            "alias": null,
            "disabled": false,
            "key": "user.name",
            "negate": false,
            "params": Object {
              "query": "elastic",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "user.name": "elastic",
            },
          },
        },
      ]
    `);
  });

  test('should render an emptry array if no field name mapped', () => {
    expect(getDetailsPageFilter('xxx')).toMatchInlineSnapshot(`Array []`);
  });
});

describe('getNetworkDetailsPageFilter', () => {
  test('should render network details filter', () => {
    expect(getNetworkDetailsPageFilter('192.168.1.1')).toMatchInlineSnapshot(`
      Array [
        Object {
          "meta": Object {
            "alias": null,
            "disabled": false,
            "key": "source.ip",
            "negate": false,
            "params": Object {
              "query": "192.168.1.1",
            },
            "type": "phrase",
          },
          "query": Object {
            "bool": Object {
              "minimum_should_match": 1,
              "should": Array [
                Object {
                  "match_phrase": Object {
                    "source.ip": "192.168.1.1",
                  },
                },
                Object {
                  "match_phrase": Object {
                    "destination.ip": "192.168.1.1",
                  },
                },
              ],
            },
          },
        },
      ]
    `);
  });
});

describe('getIndexFilters', () => {
  test('should render index filter', () => {
    expect(['auditbeat-*']).toMatchInlineSnapshot(`
      Array [
        "auditbeat-*",
      ]
    `);
  });
});

describe('getRequestsAndResponses', () => {
  test('should parse requests and responses', () => {
    expect(getRequestsAndResponses(mockRequests)).toMatchSnapshot();
  });
});

describe('parseVisualizationData', () => {
  const data = [
    '{\n  "took": 4,\n  "timed_out": false,\n  "_shards": {\n    "total": 3,\n    "successful": 3,\n    "skipped": 2,\n    "failed": 0\n  },\n  "hits": {\n    "total": 21300,\n    "max_score": null,\n    "hits": []\n  },\n  "aggregations": {\n    "0": {\n      "buckets": {\n        "Critical": {\n          "doc_count": 0\n        },\n        "High": {\n          "doc_count": 0\n        },\n        "Low": {\n          "doc_count": 21300\n        },\n        "Medium": {\n          "doc_count": 0\n        }\n      }\n    }\n  }\n}',
  ];
  test('should parse data', () => {
    expect(parseVisualizationData(data)).toMatchInlineSnapshot(`
      Array [
        Object {
          "_shards": Object {
            "failed": 0,
            "skipped": 2,
            "successful": 3,
            "total": 3,
          },
          "aggregations": Object {
            "0": Object {
              "buckets": Object {
                "Critical": Object {
                  "doc_count": 0,
                },
                "High": Object {
                  "doc_count": 0,
                },
                "Low": Object {
                  "doc_count": 21300,
                },
                "Medium": Object {
                  "doc_count": 0,
                },
              },
            },
          },
          "hits": Object {
            "hits": Array [],
            "max_score": null,
            "total": 21300,
          },
          "timed_out": false,
          "took": 4,
        },
      ]
    `);
  });
});
