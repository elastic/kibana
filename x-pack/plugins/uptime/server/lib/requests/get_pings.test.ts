/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPings } from './get_pings';
import { set } from '@elastic/safer-lodash-set';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { getUptimeESMockClient } from './helper';

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
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResponseOnce(mockEsSearchResult);

    const result = await getPings({
      uptimeEsClient,
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
    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
  });

  it('creates appropriate sort and size parameters', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResponseOnce(mockEsSearchResult);

    await getPings({
      uptimeEsClient,
      dateRange: { from: 'now-1h', to: 'now' },
      sort: 'asc',
      size: 12,
    });
    set(expectedGetAllParams, 'body.sort[0]', { timestamp: { order: 'asc' } });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(mockEsClient.search.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
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
                "must_not": Array [
                  Object {
                    "bool": Object {
                      "filter": Array [
                        Object {
                          "term": Object {
                            "monitor.type": "browser",
                          },
                        },
                        Object {
                          "bool": Object {
                            "must_not": Array [
                              Object {
                                "exists": Object {
                                  "field": "summary",
                                },
                              },
                            ],
                          },
                        },
                      ],
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
          "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
        },
        Object {
          "meta": true,
        },
      ]
    `);
  });

  it('omits the sort param when no sort passed', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResponseOnce(mockEsSearchResult);

    await getPings({
      uptimeEsClient,
      dateRange: { from: 'now-1h', to: 'now' },
      size: 12,
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(mockEsClient.search.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
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
                "must_not": Array [
                  Object {
                    "bool": Object {
                      "filter": Array [
                        Object {
                          "term": Object {
                            "monitor.type": "browser",
                          },
                        },
                        Object {
                          "bool": Object {
                            "must_not": Array [
                              Object {
                                "exists": Object {
                                  "field": "summary",
                                },
                              },
                            ],
                          },
                        },
                      ],
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
          "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
        },
        Object {
          "meta": true,
        },
      ]
    `);
  });

  it('omits the size param when no size passed', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResponseOnce(mockEsSearchResult);

    await getPings({
      uptimeEsClient,
      dateRange: { from: 'now-1h', to: 'now' },
      sort: 'desc',
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(mockEsClient.search.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
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
                "must_not": Array [
                  Object {
                    "bool": Object {
                      "filter": Array [
                        Object {
                          "term": Object {
                            "monitor.type": "browser",
                          },
                        },
                        Object {
                          "bool": Object {
                            "must_not": Array [
                              Object {
                                "exists": Object {
                                  "field": "summary",
                                },
                              },
                            ],
                          },
                        },
                      ],
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
          "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
        },
        Object {
          "meta": true,
        },
      ]
    `);
  });

  it('adds a filter for monitor ID', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResponseOnce(mockEsSearchResult);

    await getPings({
      uptimeEsClient,
      dateRange: { from: 'now-1h', to: 'now' },
      monitorId: 'testmonitorid',
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(mockEsClient.search.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
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
                "must_not": Array [
                  Object {
                    "bool": Object {
                      "filter": Array [
                        Object {
                          "term": Object {
                            "monitor.type": "browser",
                          },
                        },
                        Object {
                          "bool": Object {
                            "must_not": Array [
                              Object {
                                "exists": Object {
                                  "field": "summary",
                                },
                              },
                            ],
                          },
                        },
                      ],
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
          "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
        },
        Object {
          "meta": true,
        },
      ]
    `);
  });

  it('adds excluded locations terms agg', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResponseOnce(mockEsSearchResult);

    await getPings({
      uptimeEsClient,
      dateRange: { from: 'now-1h', to: 'now' },
      excludedLocations: `["fairbanks"]`,
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    // @ts-expect-error the response is not typed, but should always result in this object, and in this order,
    // unless the code that builds the query is modified.
    expect(mockEsClient.search.mock.calls[0][0].body.query.bool.filter[1]).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "must_not": Array [
            Object {
              "terms": Object {
                "observer.geo.name": Array [
                  "fairbanks",
                ],
              },
            },
          ],
        },
      }
    `);
  });

  it('throws error for invalid exclusions', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResponseOnce(mockEsSearchResult);

    await expect(
      getPings({
        uptimeEsClient,
        dateRange: { from: 'now-1h', to: 'now' },
        excludedLocations: `["fairbanks", 2345]`,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Excluded locations can only be strings"`);
  });

  it('adds a filter for monitor status', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResponseOnce(mockEsSearchResult);

    await getPings({
      uptimeEsClient,
      dateRange: { from: 'now-1h', to: 'now' },
      status: 'down',
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(mockEsClient.search.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
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
                "must_not": Array [
                  Object {
                    "bool": Object {
                      "filter": Array [
                        Object {
                          "term": Object {
                            "monitor.type": "browser",
                          },
                        },
                        Object {
                          "bool": Object {
                            "must_not": Array [
                              Object {
                                "exists": Object {
                                  "field": "summary",
                                },
                              },
                            ],
                          },
                        },
                      ],
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
          "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
        },
        Object {
          "meta": true,
        },
      ]
    `);
  });
});
