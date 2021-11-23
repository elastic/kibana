/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMonitorStatus } from './get_monitor_status';
import { getUptimeESMockClient, setupMockEsCompositeQuery } from './helper';

export interface BucketItemCriteria {
  monitorId: string;
  status: string;
  location: string;
  doc_count: number;
}

interface BucketKey {
  monitorId: string;
  status: string;
  location: string;
}

interface BucketItem {
  key: BucketKey;
  doc_count: number;
}

const genBucketItem = ({
  monitorId,
  status,
  location,
  doc_count: count,
}: BucketItemCriteria): BucketItem => ({
  key: {
    monitorId,
    status,
    location,
  },
  doc_count: count,
});

describe('getMonitorStatus', () => {
  it('applies bool filters to params', async () => {
    const esMock = setupMockEsCompositeQuery<BucketKey, BucketItemCriteria, BucketItem>(
      [],
      genBucketItem
    );
    const exampleFilter = {
      bool: {
        should: [
          {
            bool: {
              should: [
                {
                  match_phrase: {
                    'monitor.id': 'apm-dev',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              should: [
                {
                  match_phrase: {
                    'monitor.id': 'auto-http-0X8D6082B94BBE3B8A',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
        minimum_should_match: 1,
      },
    };

    const { uptimeEsClient } = getUptimeESMockClient(esMock);

    await getMonitorStatus({
      uptimeEsClient,
      filters: exampleFilter,
      locations: [],
      numTimes: 5,
      timespanRange: {
        from: 'now-10m',
        to: 'now-1m',
      },
      timestampRange: {
        from: 'now-24h',
        to: 'now',
      },
    });
    expect(esMock.search).toHaveBeenCalledTimes(1);
    const [params] = esMock.search.mock.calls[0];
    expect(params).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "aggs": Object {
            "monitors": Object {
              "aggs": Object {
                "fields": Object {
                  "top_hits": Object {
                    "size": 1,
                    "sort": Array [
                      Object {
                        "@timestamp": "desc",
                      },
                    ],
                  },
                },
              },
              "composite": Object {
                "size": 2000,
                "sources": Array [
                  Object {
                    "monitorId": Object {
                      "terms": Object {
                        "field": "monitor.id",
                      },
                    },
                  },
                  Object {
                    "status": Object {
                      "terms": Object {
                        "field": "monitor.status",
                      },
                    },
                  },
                  Object {
                    "location": Object {
                      "terms": Object {
                        "field": "observer.geo.name",
                        "missing_bucket": true,
                      },
                    },
                  },
                ],
              },
            },
          },
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "exists": Object {
                    "field": "summary",
                  },
                },
                Object {
                  "range": Object {
                    "summary.down": Object {
                      "gt": "0",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
                      "gte": "now-24h",
                      "lte": "now",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "monitor.timespan": Object {
                      "gte": "now-10m",
                      "lte": "now-1m",
                    },
                  },
                },
                Object {
                  "bool": Object {
                    "minimum_should_match": 1,
                    "should": Array [
                      Object {
                        "bool": Object {
                          "minimum_should_match": 1,
                          "should": Array [
                            Object {
                              "match_phrase": Object {
                                "monitor.id": "apm-dev",
                              },
                            },
                          ],
                        },
                      },
                      Object {
                        "bool": Object {
                          "minimum_should_match": 1,
                          "should": Array [
                            Object {
                              "match_phrase": Object {
                                "monitor.id": "auto-http-0X8D6082B94BBE3B8A",
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
          "size": 0,
        },
        "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
      }
    `);
  });

  it('applies locations to params', async () => {
    const esMock = setupMockEsCompositeQuery<BucketKey, BucketItemCriteria, BucketItem>(
      [],
      genBucketItem
    );

    const { uptimeEsClient } = getUptimeESMockClient(esMock);

    await getMonitorStatus({
      uptimeEsClient,
      locations: ['fairbanks', 'harrisburg'],
      numTimes: 1,
      timespanRange: {
        from: 'now-2m',
        to: 'now',
      },
      timestampRange: {
        from: 'now-24h',
        to: 'now',
      },
    });
    expect(esMock.search).toHaveBeenCalledTimes(1);
    const [params] = esMock.search.mock.calls[0];
    expect(params).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "aggs": Object {
            "monitors": Object {
              "aggs": Object {
                "fields": Object {
                  "top_hits": Object {
                    "size": 1,
                    "sort": Array [
                      Object {
                        "@timestamp": "desc",
                      },
                    ],
                  },
                },
              },
              "composite": Object {
                "size": 2000,
                "sources": Array [
                  Object {
                    "monitorId": Object {
                      "terms": Object {
                        "field": "monitor.id",
                      },
                    },
                  },
                  Object {
                    "status": Object {
                      "terms": Object {
                        "field": "monitor.status",
                      },
                    },
                  },
                  Object {
                    "location": Object {
                      "terms": Object {
                        "field": "observer.geo.name",
                        "missing_bucket": true,
                      },
                    },
                  },
                ],
              },
            },
          },
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "exists": Object {
                    "field": "summary",
                  },
                },
                Object {
                  "range": Object {
                    "summary.down": Object {
                      "gt": "0",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
                      "gte": "now-24h",
                      "lte": "now",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "monitor.timespan": Object {
                      "gte": "now-2m",
                      "lte": "now",
                    },
                  },
                },
                Object {
                  "bool": Object {
                    "should": Array [
                      Object {
                        "term": Object {
                          "observer.geo.name": "fairbanks",
                        },
                      },
                      Object {
                        "term": Object {
                          "observer.geo.name": "harrisburg",
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          "size": 0,
        },
        "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
      }
    `);
  });

  it('properly assigns filters for complex kuery filters', async () => {
    const esMock = setupMockEsCompositeQuery<BucketKey, BucketItemCriteria, BucketItem>(
      [{ bucketCriteria: [] }],
      genBucketItem
    );
    const clientParameters = {
      timespanRange: {
        from: 'now-15m',
        to: 'now',
      },
      timestampRange: {
        from: 'now-24h',
        to: 'now',
      },
      numTimes: 5,
      locations: [],
      filters: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      tags: 'org:google',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  {
                    bool: {
                      should: [
                        {
                          match_phrase: {
                            'monitor.type': 'http',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [
                        {
                          match_phrase: {
                            'monitor.type': 'tcp',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    };

    const { uptimeEsClient } = getUptimeESMockClient(esMock);

    await getMonitorStatus({
      uptimeEsClient,
      ...clientParameters,
    });
    expect(esMock.search).toHaveBeenCalledTimes(1);
    const [params] = esMock.search.mock.calls[0];
    expect(params).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "aggs": Object {
            "monitors": Object {
              "aggs": Object {
                "fields": Object {
                  "top_hits": Object {
                    "size": 1,
                    "sort": Array [
                      Object {
                        "@timestamp": "desc",
                      },
                    ],
                  },
                },
              },
              "composite": Object {
                "size": 2000,
                "sources": Array [
                  Object {
                    "monitorId": Object {
                      "terms": Object {
                        "field": "monitor.id",
                      },
                    },
                  },
                  Object {
                    "status": Object {
                      "terms": Object {
                        "field": "monitor.status",
                      },
                    },
                  },
                  Object {
                    "location": Object {
                      "terms": Object {
                        "field": "observer.geo.name",
                        "missing_bucket": true,
                      },
                    },
                  },
                ],
              },
            },
          },
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "exists": Object {
                    "field": "summary",
                  },
                },
                Object {
                  "range": Object {
                    "summary.down": Object {
                      "gt": "0",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
                      "gte": "now-24h",
                      "lte": "now",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "monitor.timespan": Object {
                      "gte": "now-15m",
                      "lte": "now",
                    },
                  },
                },
                Object {
                  "bool": Object {
                    "filter": Array [
                      Object {
                        "bool": Object {
                          "minimum_should_match": 1,
                          "should": Array [
                            Object {
                              "match_phrase": Object {
                                "tags": "org:google",
                              },
                            },
                          ],
                        },
                      },
                      Object {
                        "bool": Object {
                          "minimum_should_match": 1,
                          "should": Array [
                            Object {
                              "bool": Object {
                                "minimum_should_match": 1,
                                "should": Array [
                                  Object {
                                    "match_phrase": Object {
                                      "monitor.type": "http",
                                    },
                                  },
                                ],
                              },
                            },
                            Object {
                              "bool": Object {
                                "minimum_should_match": 1,
                                "should": Array [
                                  Object {
                                    "match_phrase": Object {
                                      "monitor.type": "tcp",
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
              ],
            },
          },
          "size": 0,
        },
        "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
      }
    `);
  });

  it('properly assigns filters for complex kuery filters object', async () => {
    const esMock = setupMockEsCompositeQuery<BucketKey, BucketItemCriteria, BucketItem>(
      [{ bucketCriteria: [] }],
      genBucketItem
    );
    const clientParameters = {
      timespanRange: {
        from: 'now-15m',
        to: 'now',
      },
      timestampRange: {
        from: 'now-24h',
        to: 'now',
      },
      numTimes: 5,
      locations: [],
      filters: {
        bool: {
          filter: {
            exists: {
              field: 'monitor.status',
            },
          },
        },
      },
    };

    const { uptimeEsClient } = getUptimeESMockClient(esMock);

    await getMonitorStatus({
      uptimeEsClient,
      ...clientParameters,
    });
    expect(esMock.search).toHaveBeenCalledTimes(1);
    const [params] = esMock.search.mock.calls[0];
    expect(params).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "aggs": Object {
            "monitors": Object {
              "aggs": Object {
                "fields": Object {
                  "top_hits": Object {
                    "size": 1,
                    "sort": Array [
                      Object {
                        "@timestamp": "desc",
                      },
                    ],
                  },
                },
              },
              "composite": Object {
                "size": 2000,
                "sources": Array [
                  Object {
                    "monitorId": Object {
                      "terms": Object {
                        "field": "monitor.id",
                      },
                    },
                  },
                  Object {
                    "status": Object {
                      "terms": Object {
                        "field": "monitor.status",
                      },
                    },
                  },
                  Object {
                    "location": Object {
                      "terms": Object {
                        "field": "observer.geo.name",
                        "missing_bucket": true,
                      },
                    },
                  },
                ],
              },
            },
          },
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "exists": Object {
                    "field": "summary",
                  },
                },
                Object {
                  "range": Object {
                    "summary.down": Object {
                      "gt": "0",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
                      "gte": "now-24h",
                      "lte": "now",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "monitor.timespan": Object {
                      "gte": "now-15m",
                      "lte": "now",
                    },
                  },
                },
                Object {
                  "bool": Object {
                    "filter": Object {
                      "exists": Object {
                        "field": "monitor.status",
                      },
                    },
                  },
                },
              ],
            },
          },
          "size": 0,
        },
        "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
      }
    `);
  });

  it('fetches single page of results', async () => {
    const esMock = setupMockEsCompositeQuery<BucketKey, BucketItemCriteria, BucketItem>(
      [
        {
          bucketCriteria: [
            {
              monitorId: 'foo',
              status: 'down',
              location: 'fairbanks',
              doc_count: 43,
            },
            {
              monitorId: 'bar',
              status: 'down',
              location: 'harrisburg',
              doc_count: 53,
            },
            {
              monitorId: 'foo',
              status: 'down',
              location: 'harrisburg',
              doc_count: 44,
            },
          ],
        },
      ],
      genBucketItem
    );
    const clientParameters = {
      filters: undefined,
      locations: [],
      numTimes: 5,
      timespanRange: {
        from: 'now-12m',
        to: 'now-2m',
      },
      timestampRange: {
        from: 'now-24h',
        to: 'now',
      },
    };

    const { uptimeEsClient } = getUptimeESMockClient(esMock);

    const result = await getMonitorStatus({
      uptimeEsClient,
      ...clientParameters,
    });
    expect(esMock.search).toHaveBeenCalledTimes(1);
    const [params] = esMock.search.mock.calls[0];
    expect(params).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "aggs": Object {
            "monitors": Object {
              "aggs": Object {
                "fields": Object {
                  "top_hits": Object {
                    "size": 1,
                    "sort": Array [
                      Object {
                        "@timestamp": "desc",
                      },
                    ],
                  },
                },
              },
              "composite": Object {
                "size": 2000,
                "sources": Array [
                  Object {
                    "monitorId": Object {
                      "terms": Object {
                        "field": "monitor.id",
                      },
                    },
                  },
                  Object {
                    "status": Object {
                      "terms": Object {
                        "field": "monitor.status",
                      },
                    },
                  },
                  Object {
                    "location": Object {
                      "terms": Object {
                        "field": "observer.geo.name",
                        "missing_bucket": true,
                      },
                    },
                  },
                ],
              },
            },
          },
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "exists": Object {
                    "field": "summary",
                  },
                },
                Object {
                  "range": Object {
                    "summary.down": Object {
                      "gt": "0",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
                      "gte": "now-24h",
                      "lte": "now",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "monitor.timespan": Object {
                      "gte": "now-12m",
                      "lte": "now-2m",
                    },
                  },
                },
              ],
            },
          },
          "size": 0,
        },
        "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
      }
    `);
    expect(result.length).toBe(3);

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "count": 43,
          "location": "fairbanks",
          "monitorId": "foo",
          "monitorInfo": undefined,
          "status": "down",
        },
        Object {
          "count": 53,
          "location": "harrisburg",
          "monitorId": "bar",
          "monitorInfo": undefined,
          "status": "down",
        },
        Object {
          "count": 44,
          "location": "harrisburg",
          "monitorId": "foo",
          "monitorInfo": undefined,
          "status": "down",
        },
      ]
    `);
  });

  it('fetches multiple pages of ES results', async () => {
    const criteria = [
      {
        after_key: {
          monitorId: 'foo',
          location: 'harrisburg',
          status: 'down',
        },
        bucketCriteria: [
          {
            monitorId: 'foo',
            status: 'down',
            location: 'fairbanks',
            doc_count: 43,
          },
          {
            monitorId: 'bar',
            status: 'down',
            location: 'harrisburg',
            doc_count: 53,
          },
          {
            monitorId: 'foo',
            status: 'down',
            location: 'harrisburg',
            doc_count: 44,
          },
        ],
      },
      {
        after_key: {
          monitorId: 'bar',
          status: 'down',
          location: 'fairbanks',
        },
        bucketCriteria: [
          {
            monitorId: 'sna',
            status: 'down',
            location: 'fairbanks',
            doc_count: 21,
          },
          {
            monitorId: 'fu',
            status: 'down',
            location: 'fairbanks',
            doc_count: 21,
          },
          {
            monitorId: 'bar',
            status: 'down',
            location: 'fairbanks',
            doc_count: 45,
          },
        ],
      },
      {
        bucketCriteria: [
          {
            monitorId: 'sna',
            status: 'down',
            location: 'harrisburg',
            doc_count: 21,
          },
          {
            monitorId: 'fu',
            status: 'down',
            location: 'harrisburg',
            doc_count: 21,
          },
        ],
      },
    ];
    const esMock = setupMockEsCompositeQuery<BucketKey, BucketItemCriteria, BucketItem>(
      criteria,
      genBucketItem
    );

    const { uptimeEsClient } = getUptimeESMockClient(esMock);

    const result = await getMonitorStatus({
      uptimeEsClient,
      locations: [],
      numTimes: 5,
      timespanRange: {
        from: 'now-10m',
        to: 'now-1m',
      },
      timestampRange: {
        from: 'now-24h',
        to: 'now',
      },
    });
    expect(result.length).toBe(8);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "count": 43,
          "location": "fairbanks",
          "monitorId": "foo",
          "monitorInfo": undefined,
          "status": "down",
        },
        Object {
          "count": 53,
          "location": "harrisburg",
          "monitorId": "bar",
          "monitorInfo": undefined,
          "status": "down",
        },
        Object {
          "count": 44,
          "location": "harrisburg",
          "monitorId": "foo",
          "monitorInfo": undefined,
          "status": "down",
        },
        Object {
          "count": 21,
          "location": "fairbanks",
          "monitorId": "sna",
          "monitorInfo": undefined,
          "status": "down",
        },
        Object {
          "count": 21,
          "location": "fairbanks",
          "monitorId": "fu",
          "monitorInfo": undefined,
          "status": "down",
        },
        Object {
          "count": 45,
          "location": "fairbanks",
          "monitorId": "bar",
          "monitorInfo": undefined,
          "status": "down",
        },
        Object {
          "count": 21,
          "location": "harrisburg",
          "monitorId": "sna",
          "monitorInfo": undefined,
          "status": "down",
        },
        Object {
          "count": 21,
          "location": "harrisburg",
          "monitorId": "fu",
          "monitorInfo": undefined,
          "status": "down",
        },
      ]
    `);
  });
});
