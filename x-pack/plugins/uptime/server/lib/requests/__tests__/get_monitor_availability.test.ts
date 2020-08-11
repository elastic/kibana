/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  formatBuckets,
  GetMonitorAvailabilityResult,
  AvailabilityKey,
  getMonitorAvailability,
} from '../get_monitor_availability';
import { setupMockEsCompositeQuery } from './helper';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';
import { GetMonitorAvailabilityParams } from '../../../../common/runtime_types';
interface AvailabilityTopHit {
  _source: {
    monitor: {
      name: string;
    };
    url: {
      full: string;
    };
  };
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
  name,
  url,
  up,
  down,
  availabilityRatio,
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
          _source: {
            monitor: {
              name,
            },
            url: {
              full: url,
            },
          },
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
      const [callES, esMock] = setupMockEsCompositeQuery<
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
      await getMonitorAvailability({
        callES,
        dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
        filters: exampleFilter,
        range: 2,
        rangeUnit: 'w',
        threshold: '54',
      });
      expect(esMock.callAsCurrentUser).toHaveBeenCalledTimes(1);
      const [method, params] = esMock.callAsCurrentUser.mock.calls[0];
      expect(method).toEqual('search');
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
                      "_source": Array [
                        "monitor.name",
                        "url.full",
                      ],
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
                    "range": Object {
                      "@timestamp": Object {
                        "gte": "now-2w",
                        "lte": "now",
                      },
                    },
                  },
                ],
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
            "size": 0,
          },
          "index": "heartbeat-8*",
        }
      `);
    });

    it('fetches a single page of results', async () => {
      const [callES, esMock] = setupMockEsCompositeQuery<
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
                name: 'Foo',
                url: 'http://foo.com',
                up: 456,
                down: 234,
                availabilityRatio: 0.660869565217391,
              },
              {
                monitorId: 'foo',
                location: 'faribanks',
                name: 'Foo',
                url: 'http://foo.com',
                up: 450,
                down: 240,
                availabilityRatio: 0.652173913043478,
              },
              {
                monitorId: 'bar',
                location: 'fairbanks',
                name: 'Bar',
                url: 'http://bar.com',
                up: 468,
                down: 212,
                availabilityRatio: 0.688235294117647,
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
      const result = await getMonitorAvailability({
        callES,
        dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
        ...clientParameters,
      });
      expect(esMock.callAsCurrentUser).toHaveBeenCalledTimes(1);
      const [method, params] = esMock.callAsCurrentUser.mock.calls[0];
      expect(method).toEqual('search');
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
                      "_source": Array [
                        "monitor.name",
                        "url.full",
                      ],
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
          "index": "heartbeat-8*",
        }
      `);

      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "availabilityRatio": 0.660869565217391,
            "down": 234,
            "location": "harrisburg",
            "monitorId": "foo",
            "name": "Foo",
            "up": 456,
            "url": "http://foo.com",
          },
          Object {
            "availabilityRatio": 0.652173913043478,
            "down": 240,
            "location": "faribanks",
            "monitorId": "foo",
            "name": "Foo",
            "up": 450,
            "url": "http://foo.com",
          },
          Object {
            "availabilityRatio": 0.688235294117647,
            "down": 212,
            "location": "fairbanks",
            "monitorId": "bar",
            "name": "Bar",
            "up": 468,
            "url": "http://bar.com",
          },
        ]
      `);
    });

    it('fetches multiple pages', async () => {
      const [callES, esMock] = setupMockEsCompositeQuery<
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
                name: 'Foo',
                url: 'http://foo.com',
                up: 243,
                down: 11,
                availabilityRatio: 0.956692913385827,
              },
              {
                monitorId: 'foo',
                location: 'fairbanks',
                name: 'Foo',
                url: 'http://foo.com',
                up: 251,
                down: 13,
                availabilityRatio: 0.950757575757576,
              },
            ],
          },
          {
            bucketCriteria: [
              {
                monitorId: 'baz',
                location: 'harrisburg',
                name: 'Baz',
                url: 'http://baz.com',
                up: 341,
                down: 3,
                availabilityRatio: 0.991279069767442,
              },
              {
                monitorId: 'baz',
                location: 'fairbanks',
                name: 'Baz',
                url: 'http://baz.com',
                up: 365,
                down: 5,
                availabilityRatio: 0.986486486486486,
              },
            ],
          },
        ],
        genBucketItem
      );
      const result = await getMonitorAvailability({
        callES,
        dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
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
            "name": "Foo",
            "up": 243,
            "url": "http://foo.com",
          },
          Object {
            "availabilityRatio": 0.950757575757576,
            "down": 13,
            "location": "fairbanks",
            "monitorId": "foo",
            "name": "Foo",
            "up": 251,
            "url": "http://foo.com",
          },
          Object {
            "availabilityRatio": 0.991279069767442,
            "down": 3,
            "location": "harrisburg",
            "monitorId": "baz",
            "name": "Baz",
            "up": 341,
            "url": "http://baz.com",
          },
          Object {
            "availabilityRatio": 0.986486486486486,
            "down": 5,
            "location": "fairbanks",
            "monitorId": "baz",
            "name": "Baz",
            "up": 365,
            "url": "http://baz.com",
          },
        ]
      `);
      const [method, params] = esMock.callAsCurrentUser.mock.calls[0];
      expect(esMock.callAsCurrentUser).toHaveBeenCalledTimes(2);
      expect(method).toEqual('search');
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
                      "_source": Array [
                        "monitor.name",
                        "url.full",
                      ],
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
          "index": "heartbeat-8*",
        }
      `);
      expect(esMock.callAsCurrentUser.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          "search",
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
                        "_source": Array [
                          "monitor.name",
                          "url.full",
                        ],
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
            "index": "heartbeat-8*",
          },
        ]
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
            "name": "Test Node Service",
            "up": 821,
            "url": "http://localhost:12349",
          },
          Object {
            "availabilityRatio": 0.5804076040417879,
            "down": 2450,
            "location": "harrisburg",
            "monitorId": "test-node-service",
            "name": "Test Node Service",
            "up": 3389,
            "url": "http://localhost:12349",
          },
        ]
      `);
    });
  });
});
