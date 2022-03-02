/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatBuckets,
  GetMonitorAvailabilityResult,
  AvailabilityKey,
  getMonitorAvailability,
} from './get_monitor_availability';
import { getUptimeESMockClient, setupMockEsCompositeQuery } from './helper';
import { GetMonitorAvailabilityParams, makePing, Ping } from '../../../common/runtime_types';

interface AvailabilityTopHit {
  _source: Ping;
}

interface AvailabilityDoc {
  key: AvailabilityKey;
  doc_count: number;
  up_sum: {
    value: number;
  };
  down_sum: {
    value: number;
  };
  fields: {
    hits: {
      hits: AvailabilityTopHit[];
    };
  };
  ratio: {
    value: number | null;
  };
}

const genBucketItem = ({
  monitorId,
  location,
  up,
  down,
  availabilityRatio,
  monitorInfo,
}: GetMonitorAvailabilityResult): AvailabilityDoc => ({
  key: {
    monitorId,
    location,
  },
  doc_count: up + down,
  fields: {
    hits: {
      hits: [
        {
          _source: monitorInfo,
        },
      ],
    },
  },
  up_sum: {
    value: up,
  },
  down_sum: {
    value: down,
  },
  ratio: {
    value: availabilityRatio,
  },
});

describe('monitor availability', () => {
  describe('getMonitorAvailability', () => {
    it('applies bool filters to params', async () => {
      const esMock = setupMockEsCompositeQuery<
        AvailabilityKey,
        GetMonitorAvailabilityResult,
        AvailabilityDoc
      >([], genBucketItem);
      const exampleFilter = `{
      "bool": {
        "should": [
          {
            "bool": {
              "should": [
                {
                  "match_phrase": {
                    "monitor.id": "apm-dev"
                  }
                }
              ],
              "minimum_should_match": 1
            }
          },
          {
            "bool": {
              "should": [
                {
                  "match_phrase": {
                    "monitor.id": "auto-http-0X8D6082B94BBE3B8A"
                  }
                }
              ],
              "minimum_should_match": 1
            }
          }
        ],
        "minimum_should_match": 1
      }
    }`;

      const { uptimeEsClient } = getUptimeESMockClient(esMock);

      await getMonitorAvailability({
        uptimeEsClient,
        filters: exampleFilter,
        range: 2,
        rangeUnit: 'w',
        threshold: '54',
      });
      expect(esMock.search).toHaveBeenCalledTimes(1);
      const [params] = esMock.search.mock.calls[0];
      expect(params).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "aggs": Object {
              "monitors": Object {
                "aggs": Object {
                  "down_sum": Object {
                    "sum": Object {
                      "field": "summary.down",
                      "missing": 0,
                    },
                  },
                  "fields": Object {
                    "top_hits": Object {
                      "size": 1,
                      "sort": Array [
                        Object {
                          "@timestamp": Object {
                            "order": "desc",
                          },
                        },
                      ],
                    },
                  },
                  "filtered": Object {
                    "bucket_selector": Object {
                      "buckets_path": Object {
                        "threshold": "ratio.value",
                      },
                      "script": "params.threshold < 0.54",
                    },
                  },
                  "ratio": Object {
                    "bucket_script": Object {
                      "buckets_path": Object {
                        "downTotal": "down_sum",
                        "upTotal": "up_sum",
                      },
                      "script": "
                        if (params.upTotal + params.downTotal > 0) {
                          return params.upTotal / (params.upTotal + params.downTotal);
                        } return null;",
                    },
                  },
                  "up_sum": Object {
                    "sum": Object {
                      "field": "summary.up",
                      "missing": 0,
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
                      "@timestamp": Object {
                        "gte": "now-2w",
                        "lte": "now",
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

    it('fetches a single page of results', async () => {
      const esMock = setupMockEsCompositeQuery<
        AvailabilityKey,
        GetMonitorAvailabilityResult,
        AvailabilityDoc
      >(
        [
          {
            bucketCriteria: [
              {
                monitorId: 'foo',
                location: 'harrisburg',
                up: 456,
                down: 234,
                availabilityRatio: 0.660869565217391,
                monitorInfo: makePing({}),
              },
              {
                monitorId: 'foo',
                location: 'faribanks',
                up: 450,
                down: 240,
                availabilityRatio: 0.652173913043478,
                monitorInfo: makePing({}),
              },
              {
                monitorId: 'bar',
                location: 'fairbanks',
                up: 468,
                down: 212,
                availabilityRatio: 0.688235294117647,
                monitorInfo: makePing({}),
              },
            ],
          },
        ],
        genBucketItem
      );
      const clientParameters: GetMonitorAvailabilityParams = {
        range: 23,
        rangeUnit: 'd',
        threshold: '69',
      };

      const { uptimeEsClient } = getUptimeESMockClient(esMock);

      const result = await getMonitorAvailability({
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
                  "down_sum": Object {
                    "sum": Object {
                      "field": "summary.down",
                      "missing": 0,
                    },
                  },
                  "fields": Object {
                    "top_hits": Object {
                      "size": 1,
                      "sort": Array [
                        Object {
                          "@timestamp": Object {
                            "order": "desc",
                          },
                        },
                      ],
                    },
                  },
                  "filtered": Object {
                    "bucket_selector": Object {
                      "buckets_path": Object {
                        "threshold": "ratio.value",
                      },
                      "script": "params.threshold < 0.69",
                    },
                  },
                  "ratio": Object {
                    "bucket_script": Object {
                      "buckets_path": Object {
                        "downTotal": "down_sum",
                        "upTotal": "up_sum",
                      },
                      "script": "
                        if (params.upTotal + params.downTotal > 0) {
                          return params.upTotal / (params.upTotal + params.downTotal);
                        } return null;",
                    },
                  },
                  "up_sum": Object {
                    "sum": Object {
                      "field": "summary.up",
                      "missing": 0,
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
                      "@timestamp": Object {
                        "gte": "now-23d",
                        "lte": "now",
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

      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "availabilityRatio": 0.660869565217391,
            "down": 234,
            "location": "harrisburg",
            "monitorId": "foo",
            "monitorInfo": Object {
              "docId": "myDocId",
              "monitor": Object {
                "duration": Object {
                  "us": 100000,
                },
                "id": "myId",
                "ip": "127.0.0.1",
                "name": undefined,
                "status": "up",
                "type": "myType",
              },
              "timestamp": "2020-07-07T01:14:08Z",
            },
            "up": 456,
          },
          Object {
            "availabilityRatio": 0.652173913043478,
            "down": 240,
            "location": "faribanks",
            "monitorId": "foo",
            "monitorInfo": Object {
              "docId": "myDocId",
              "monitor": Object {
                "duration": Object {
                  "us": 100000,
                },
                "id": "myId",
                "ip": "127.0.0.1",
                "name": undefined,
                "status": "up",
                "type": "myType",
              },
              "timestamp": "2020-07-07T01:14:08Z",
            },
            "up": 450,
          },
          Object {
            "availabilityRatio": 0.688235294117647,
            "down": 212,
            "location": "fairbanks",
            "monitorId": "bar",
            "monitorInfo": Object {
              "docId": "myDocId",
              "monitor": Object {
                "duration": Object {
                  "us": 100000,
                },
                "id": "myId",
                "ip": "127.0.0.1",
                "name": undefined,
                "status": "up",
                "type": "myType",
              },
              "timestamp": "2020-07-07T01:14:08Z",
            },
            "up": 468,
          },
        ]
      `);
    });

    it('fetches multiple pages', async () => {
      const esMock = setupMockEsCompositeQuery<
        AvailabilityKey,
        GetMonitorAvailabilityResult,
        AvailabilityDoc
      >(
        [
          {
            after_key: {
              monitorId: 'baz',
              location: 'harrisburg',
            },
            bucketCriteria: [
              {
                monitorId: 'foo',
                location: 'harrisburg',
                up: 243,
                down: 11,
                availabilityRatio: 0.956692913385827,
                monitorInfo: makePing({}),
              },
              {
                monitorId: 'foo',
                location: 'fairbanks',
                up: 251,
                down: 13,
                availabilityRatio: 0.950757575757576,
                monitorInfo: makePing({}),
              },
            ],
          },
          {
            bucketCriteria: [
              {
                monitorId: 'baz',
                location: 'harrisburg',
                up: 341,
                down: 3,
                availabilityRatio: 0.991279069767442,
                monitorInfo: makePing({}),
              },
              {
                monitorId: 'baz',
                location: 'fairbanks',
                up: 365,
                down: 5,
                availabilityRatio: 0.986486486486486,
                monitorInfo: makePing({}),
              },
            ],
          },
        ],
        genBucketItem
      );
      const { uptimeEsClient } = getUptimeESMockClient(esMock);

      const result = await getMonitorAvailability({
        uptimeEsClient,
        range: 3,
        rangeUnit: 'M',
        threshold: '98',
      });
      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "availabilityRatio": 0.956692913385827,
            "down": 11,
            "location": "harrisburg",
            "monitorId": "foo",
            "monitorInfo": Object {
              "docId": "myDocId",
              "monitor": Object {
                "duration": Object {
                  "us": 100000,
                },
                "id": "myId",
                "ip": "127.0.0.1",
                "name": undefined,
                "status": "up",
                "type": "myType",
              },
              "timestamp": "2020-07-07T01:14:08Z",
            },
            "up": 243,
          },
          Object {
            "availabilityRatio": 0.950757575757576,
            "down": 13,
            "location": "fairbanks",
            "monitorId": "foo",
            "monitorInfo": Object {
              "docId": "myDocId",
              "monitor": Object {
                "duration": Object {
                  "us": 100000,
                },
                "id": "myId",
                "ip": "127.0.0.1",
                "name": undefined,
                "status": "up",
                "type": "myType",
              },
              "timestamp": "2020-07-07T01:14:08Z",
            },
            "up": 251,
          },
          Object {
            "availabilityRatio": 0.991279069767442,
            "down": 3,
            "location": "harrisburg",
            "monitorId": "baz",
            "monitorInfo": Object {
              "docId": "myDocId",
              "monitor": Object {
                "duration": Object {
                  "us": 100000,
                },
                "id": "myId",
                "ip": "127.0.0.1",
                "name": undefined,
                "status": "up",
                "type": "myType",
              },
              "timestamp": "2020-07-07T01:14:08Z",
            },
            "up": 341,
          },
          Object {
            "availabilityRatio": 0.986486486486486,
            "down": 5,
            "location": "fairbanks",
            "monitorId": "baz",
            "monitorInfo": Object {
              "docId": "myDocId",
              "monitor": Object {
                "duration": Object {
                  "us": 100000,
                },
                "id": "myId",
                "ip": "127.0.0.1",
                "name": undefined,
                "status": "up",
                "type": "myType",
              },
              "timestamp": "2020-07-07T01:14:08Z",
            },
            "up": 365,
          },
        ]
      `);
      const [params] = esMock.search.mock.calls[0];
      expect(esMock.search).toHaveBeenCalledTimes(2);
      expect(params).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "aggs": Object {
              "monitors": Object {
                "aggs": Object {
                  "down_sum": Object {
                    "sum": Object {
                      "field": "summary.down",
                      "missing": 0,
                    },
                  },
                  "fields": Object {
                    "top_hits": Object {
                      "size": 1,
                      "sort": Array [
                        Object {
                          "@timestamp": Object {
                            "order": "desc",
                          },
                        },
                      ],
                    },
                  },
                  "filtered": Object {
                    "bucket_selector": Object {
                      "buckets_path": Object {
                        "threshold": "ratio.value",
                      },
                      "script": "params.threshold < 0.98",
                    },
                  },
                  "ratio": Object {
                    "bucket_script": Object {
                      "buckets_path": Object {
                        "downTotal": "down_sum",
                        "upTotal": "up_sum",
                      },
                      "script": "
                        if (params.upTotal + params.downTotal > 0) {
                          return params.upTotal / (params.upTotal + params.downTotal);
                        } return null;",
                    },
                  },
                  "up_sum": Object {
                    "sum": Object {
                      "field": "summary.up",
                      "missing": 0,
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
                      "@timestamp": Object {
                        "gte": "now-3M",
                        "lte": "now",
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

      expect(esMock.search.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          Object {
            "body": Object {
              "aggs": Object {
                "monitors": Object {
                  "aggs": Object {
                    "down_sum": Object {
                      "sum": Object {
                        "field": "summary.down",
                        "missing": 0,
                      },
                    },
                    "fields": Object {
                      "top_hits": Object {
                        "size": 1,
                        "sort": Array [
                          Object {
                            "@timestamp": Object {
                              "order": "desc",
                            },
                          },
                        ],
                      },
                    },
                    "filtered": Object {
                      "bucket_selector": Object {
                        "buckets_path": Object {
                          "threshold": "ratio.value",
                        },
                        "script": "params.threshold < 0.98",
                      },
                    },
                    "ratio": Object {
                      "bucket_script": Object {
                        "buckets_path": Object {
                          "downTotal": "down_sum",
                          "upTotal": "up_sum",
                        },
                        "script": "
                        if (params.upTotal + params.downTotal > 0) {
                          return params.upTotal / (params.upTotal + params.downTotal);
                        } return null;",
                      },
                    },
                    "up_sum": Object {
                      "sum": Object {
                        "field": "summary.up",
                        "missing": 0,
                      },
                    },
                  },
                  "composite": Object {
                    "after": Object {
                      "location": "harrisburg",
                      "monitorId": "baz",
                    },
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
                        "@timestamp": Object {
                          "gte": "now-3M",
                          "lte": "now",
                        },
                      },
                    },
                  ],
                },
              },
              "size": 0,
            },
            "index": "heartbeat-8*,heartbeat-7*,synthetics-*",
          },
          Object {
            "meta": true,
          },
        ]
      `);
    });

    it('does not overwrite filters', async () => {
      const esMock = setupMockEsCompositeQuery<
        AvailabilityKey,
        GetMonitorAvailabilityResult,
        AvailabilityDoc
      >(
        [
          {
            bucketCriteria: [],
          },
        ],
        genBucketItem
      );

      const { uptimeEsClient } = getUptimeESMockClient(esMock);

      await getMonitorAvailability({
        uptimeEsClient,
        range: 3,
        rangeUnit: 's',
        threshold: '99',
        filters: JSON.stringify({ bool: { filter: [{ term: { 'monitor.id': 'foo' } }] } }),
      });
      const [params] = esMock.search.mock.calls[0];
      expect(params).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "aggs": Object {
              "monitors": Object {
                "aggs": Object {
                  "down_sum": Object {
                    "sum": Object {
                      "field": "summary.down",
                      "missing": 0,
                    },
                  },
                  "fields": Object {
                    "top_hits": Object {
                      "size": 1,
                      "sort": Array [
                        Object {
                          "@timestamp": Object {
                            "order": "desc",
                          },
                        },
                      ],
                    },
                  },
                  "filtered": Object {
                    "bucket_selector": Object {
                      "buckets_path": Object {
                        "threshold": "ratio.value",
                      },
                      "script": "params.threshold < 0.99",
                    },
                  },
                  "ratio": Object {
                    "bucket_script": Object {
                      "buckets_path": Object {
                        "downTotal": "down_sum",
                        "upTotal": "up_sum",
                      },
                      "script": "
                        if (params.upTotal + params.downTotal > 0) {
                          return params.upTotal / (params.upTotal + params.downTotal);
                        } return null;",
                    },
                  },
                  "up_sum": Object {
                    "sum": Object {
                      "field": "summary.up",
                      "missing": 0,
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
                      "@timestamp": Object {
                        "gte": "now-3s",
                        "lte": "now",
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "filter": Array [
                        Object {
                          "term": Object {
                            "monitor.id": "foo",
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
  });

  describe('formatBuckets', () => {
    let buckets: any[];

    beforeEach(() => {
      buckets = [
        {
          key: {
            monitorId: 'test-node-service',
            location: 'fairbanks',
          },
          doc_count: 3271,
          fields: {
            hits: {
              hits: [
                {
                  _source: {
                    monitor: {
                      name: 'Test Node Service',
                    },
                    url: {
                      full: 'http://localhost:12349',
                    },
                  },
                },
              ],
            },
          },
          up_sum: {
            value: 821.0,
          },
          down_sum: {
            value: 2450.0,
          },
          ratio: {
            value: 0.25099357994497096,
          },
        },
        {
          key: {
            monitorId: 'test-node-service',
            location: 'harrisburg',
          },
          fields: {
            hits: {
              hits: [
                {
                  _source: {
                    monitor: {
                      name: 'Test Node Service',
                    },
                    url: {
                      full: 'http://localhost:12349',
                    },
                  },
                },
              ],
            },
          },
          doc_count: 5839,
          up_sum: {
            value: 3389.0,
          },
          down_sum: {
            value: 2450.0,
          },
          ratio: {
            value: 0.5804076040417879,
          },
        },
      ];
    });

    it('formats the buckets to the correct shape', async () => {
      expect(await formatBuckets(buckets)).toMatchInlineSnapshot(`
        Array [
          Object {
            "availabilityRatio": 0.25099357994497096,
            "down": 2450,
            "location": "fairbanks",
            "monitorId": "test-node-service",
            "monitorInfo": Object {
              "monitor": Object {
                "name": "Test Node Service",
              },
              "url": Object {
                "full": "http://localhost:12349",
              },
            },
            "up": 821,
          },
          Object {
            "availabilityRatio": 0.5804076040417879,
            "down": 2450,
            "location": "harrisburg",
            "monitorId": "test-node-service",
            "monitorInfo": Object {
              "monitor": Object {
                "name": "Test Node Service",
              },
              "url": Object {
                "full": "http://localhost:12349",
              },
            },
            "up": 3389,
          },
        ]
      `);
    });
  });
});
