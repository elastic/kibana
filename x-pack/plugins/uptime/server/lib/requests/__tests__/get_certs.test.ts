/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCerts } from '../get_certs';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';

describe('getCerts', () => {
  let mockHits: any;
  let mockCallES: jest.Mock<any, any>;

  beforeEach(() => {
    mockHits = [
      {
        _index: 'heartbeat-8.0.0-2020.04.16-000001',
        _id: 'DJwmhHEBnyP8RKDrEYVK',
        _score: 0,
        _source: {
          tls: {
            certificate_not_valid_before: '2019-08-16T01:40:25.000Z',
            server: {
              x509: {
                subject: {
                  common_name: 'r2.shared.global.fastly.net',
                },
                issuer: {
                  common_name: 'GlobalSign CloudSSL CA - SHA256 - G3',
                },
              },
              hash: {
                sha1: 'b7b4b89ef0d0caf39d223736f0fdbb03c7b426f1',
                sha256: '12b00d04db0db8caa302bfde043e88f95baceb91e86ac143e93830b4bbec726d',
              },
            },
            certificate_not_valid_after: '2020-07-16T03:15:39.000Z',
          },
          monitor: {
            name: 'Real World Test',
            id: 'real-world-test',
          },
        },
        fields: {
          'tls.server.hash.sha256': [
            '12b00d04db0db8caa302bfde043e88f95baceb91e86ac143e93830b4bbec726d',
          ],
        },
        inner_hits: {
          monitors: {
            hits: {
              total: {
                value: 32,
                relation: 'eq',
              },
              max_score: null,
              hits: [
                {
                  _index: 'heartbeat-8.0.0-2020.04.16-000001',
                  _id: 'DJwmhHEBnyP8RKDrEYVK',
                  _score: null,
                  _source: {
                    monitor: {
                      name: 'Real World Test',
                      id: 'real-world-test',
                    },
                  },
                  fields: {
                    'monitor.id': ['real-world-test'],
                  },
                  sort: ['real-world-test'],
                },
              ],
            },
          },
        },
      },
    ];
    mockCallES = jest.fn();
    mockCallES.mockImplementation(() => ({
      hits: {
        hits: mockHits,
      },
    }));
  });

  it('parses query result and returns expected values', async () => {
    const result = await getCerts({
      callES: mockCallES,
      dynamicSettings: {
        heartbeatIndices: 'heartbeat*',
        certThresholds: DYNAMIC_SETTINGS_DEFAULTS.certThresholds,
      },
      index: 1,
      from: 'now-2d',
      to: 'now+1h',
      search: 'my_common_name',
      size: 30,
    });
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "certificate_not_valid_after": "2020-07-16T03:15:39.000Z",
          "certificate_not_valid_before": "2019-08-16T01:40:25.000Z",
          "common_name": "r2.shared.global.fastly.net",
          "issuer": "GlobalSign CloudSSL CA - SHA256 - G3",
          "monitors": Array [
            Object {
              "id": "real-world-test",
              "name": "Real World Test",
            },
          ],
          "sha1": "b7b4b89ef0d0caf39d223736f0fdbb03c7b426f1",
          "sha256": "12b00d04db0db8caa302bfde043e88f95baceb91e86ac143e93830b4bbec726d",
        },
      ]
    `);
    expect(mockCallES.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "search",
          Object {
            "body": Object {
              "_source": Array [
                "monitor.id",
                "monitor.name",
                "tls.server.x509.issuer.common_name",
                "tls.server.x509.subject.common_name",
                "tls.server.hash.sha1",
                "tls.server.hash.sha256",
                "tls.certificate_not_valid_before",
                "tls.certificate_not_valid_after",
              ],
              "collapse": Object {
                "field": "tls.server.hash.sha256",
                "inner_hits": Object {
                  "_source": Object {
                    "includes": Array [
                      "monitor.id",
                      "monitor.name",
                    ],
                  },
                  "collapse": Object {
                    "field": "monitor.id",
                  },
                  "name": "monitors",
                  "sort": Array [
                    Object {
                      "monitor.id": "asc",
                    },
                  ],
                },
              },
              "from": 1,
              "query": Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "exists": Object {
                        "field": "tls",
                      },
                    },
                    Object {
                      "range": Object {
                        "@timestamp": Object {
                          "gte": "now-2d",
                          "lte": "now+1h",
                        },
                      },
                    },
                  ],
                  "should": Array [
                    Object {
                      "wildcard": Object {
                        "tls.server.issuer": Object {
                          "value": "*my_common_name*",
                        },
                      },
                    },
                    Object {
                      "wildcard": Object {
                        "tls.common_name": Object {
                          "value": "*my_common_name*",
                        },
                      },
                    },
                    Object {
                      "wildcard": Object {
                        "monitor.id": Object {
                          "value": "*my_common_name*",
                        },
                      },
                    },
                    Object {
                      "wildcard": Object {
                        "monitor.name": Object {
                          "value": "*my_common_name*",
                        },
                      },
                    },
                  ],
                },
              },
              "size": 30,
            },
            "index": "heartbeat*",
          },
        ],
      ]
    `);
  });
});
