/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPings } from '../get_pings';
import { set } from '@elastic/safer-lodash-set';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';

describe('getAll', () => {
  let mockEsSearchResult: any;
  let mockHits: any;
  let expectedGetAllParams: any;
  beforeEach(() => {
    mockHits = [
      {
        _source: {
          '@timestamp': '2018-10-30T18:51:59.792Z',
          monitor: {
            duration: { us: 2134 },
            id: 'foo',
            status: 'up',
            type: 'http',
          },
        },
      },
      {
        _source: {
          '@timestamp': '2018-10-30T18:53:59.792Z',
          monitor: {
            duration: { us: 2131 },
            id: 'foo',
            status: 'up',
            type: 'http',
          },
        },
      },
      {
        _source: {
          '@timestamp': '2018-10-30T18:55:59.792Z',
          monitor: {
            duration: { us: 2132 },
            id: 'foo',
            status: 'up',
            type: 'http',
          },
        },
      },
    ];
    mockEsSearchResult = {
      hits: {
        total: {
          value: mockHits.length,
        },
        hits: mockHits,
      },
      aggregations: {
        locations: {
          buckets: [{ key: 'foo' }],
        },
      },
    };
    expectedGetAllParams = {
      index: DYNAMIC_SETTINGS_DEFAULTS.heartbeatIndices,
      body: {
        query: {
          bool: {
            filter: [{ range: { timestamp: { gte: 'now-1h', lte: 'now' } } }],
          },
        },
        aggregations: {
          locations: {
            terms: {
              field: 'observer.geo.name',
              missing: 'N/A',
              size: 1000,
            },
          },
        },
        sort: [{ timestamp: { order: 'desc' } }],
      },
    };
  });

  it('returns data in the appropriate shape', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    const result = await getPings({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      dateRange: { from: 'now-1h', to: 'now' },
      sort: 'asc',
      size: 12,
    });
    const count = 3;

    expect(result.total).toBe(count);

    const pings = result.pings!;
    expect(pings).toHaveLength(count);
    expect(pings[0].timestamp).toBe('2018-10-30T18:51:59.792Z');
    expect(pings[1].timestamp).toBe('2018-10-30T18:53:59.792Z');
    expect(pings[2].timestamp).toBe('2018-10-30T18:55:59.792Z');
    expect(mockEsClient).toHaveBeenCalledTimes(1);
  });

  it('creates appropriate sort and size parameters', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    await getPings({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      dateRange: { from: 'now-1h', to: 'now' },
      sort: 'asc',
      size: 12,
    });
    set(expectedGetAllParams, 'body.sort[0]', { timestamp: { order: 'asc' } });

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(mockEsClient.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "search",
        Object {
          "body": Object {
            "aggregations": Object {
              "locations": Object {
                "terms": Object {
                  "field": "observer.geo.name",
                  "missing": "N/A",
                  "size": 1000,
                },
              },
            },
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "@timestamp": Object {
                        "gte": "now-1h",
                        "lte": "now",
                      },
                    },
                  },
                ],
              },
            },
            "size": 12,
            "sort": Array [
              Object {
                "@timestamp": Object {
                  "order": "asc",
                },
              },
            ],
          },
          "index": "heartbeat-8*",
        },
      ]
    `);
  });

  it('omits the sort param when no sort passed', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    await getPings({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      dateRange: { from: 'now-1h', to: 'now' },
      size: 12,
    });

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(mockEsClient.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "search",
        Object {
          "body": Object {
            "aggregations": Object {
              "locations": Object {
                "terms": Object {
                  "field": "observer.geo.name",
                  "missing": "N/A",
                  "size": 1000,
                },
              },
            },
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "@timestamp": Object {
                        "gte": "now-1h",
                        "lte": "now",
                      },
                    },
                  },
                ],
              },
            },
            "size": 12,
            "sort": Array [
              Object {
                "@timestamp": Object {
                  "order": "desc",
                },
              },
            ],
          },
          "index": "heartbeat-8*",
        },
      ]
    `);
  });

  it('omits the size param when no size passed', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    await getPings({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      dateRange: { from: 'now-1h', to: 'now' },
      sort: 'desc',
    });

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(mockEsClient.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "search",
        Object {
          "body": Object {
            "aggregations": Object {
              "locations": Object {
                "terms": Object {
                  "field": "observer.geo.name",
                  "missing": "N/A",
                  "size": 1000,
                },
              },
            },
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "@timestamp": Object {
                        "gte": "now-1h",
                        "lte": "now",
                      },
                    },
                  },
                ],
              },
            },
            "size": 25,
            "sort": Array [
              Object {
                "@timestamp": Object {
                  "order": "desc",
                },
              },
            ],
          },
          "index": "heartbeat-8*",
        },
      ]
    `);
  });

  it('adds a filter for monitor ID', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    await getPings({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      dateRange: { from: 'now-1h', to: 'now' },
      monitorId: 'testmonitorid',
    });

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(mockEsClient.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "search",
        Object {
          "body": Object {
            "aggregations": Object {
              "locations": Object {
                "terms": Object {
                  "field": "observer.geo.name",
                  "missing": "N/A",
                  "size": 1000,
                },
              },
            },
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "@timestamp": Object {
                        "gte": "now-1h",
                        "lte": "now",
                      },
                    },
                  },
                  Object {
                    "term": Object {
                      "monitor.id": "testmonitorid",
                    },
                  },
                ],
              },
            },
            "size": 25,
            "sort": Array [
              Object {
                "@timestamp": Object {
                  "order": "desc",
                },
              },
            ],
          },
          "index": "heartbeat-8*",
        },
      ]
    `);
  });

  it('adds a filter for monitor status', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    await getPings({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      dateRange: { from: 'now-1h', to: 'now' },
      status: 'down',
    });

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(mockEsClient.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "search",
        Object {
          "body": Object {
            "aggregations": Object {
              "locations": Object {
                "terms": Object {
                  "field": "observer.geo.name",
                  "missing": "N/A",
                  "size": 1000,
                },
              },
            },
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "@timestamp": Object {
                        "gte": "now-1h",
                        "lte": "now",
                      },
                    },
                  },
                  Object {
                    "term": Object {
                      "monitor.status": "down",
                    },
                  },
                ],
              },
            },
            "size": 25,
            "sort": Array [
              Object {
                "@timestamp": Object {
                  "order": "desc",
                },
              },
            ],
          },
          "index": "heartbeat-8*",
        },
      ]
    `);
  });
});
