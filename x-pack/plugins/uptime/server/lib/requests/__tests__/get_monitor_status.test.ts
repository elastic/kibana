/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMonitorStatus } from '../get_monitor_status';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';
import { setupMockEsCompositeQuery } from './helper';

export interface BucketItemCriteria {
  monitor_id: string;
  status: string;
  location: string;
  doc_count: number;
}

interface BucketKey {
  monitor_id: string;
  status: string;
  location: string;
}

interface BucketItem {
  key: BucketKey;
  doc_count: number;
}

const genBucketItem = ({
  monitor_id,
  status,
  location,
  doc_count,
}: BucketItemCriteria): BucketItem => ({
  key: {
    monitor_id,
    status,
    location,
  },
  doc_count,
});

describe('getMonitorStatus', () => {
  it('applies bool filters to params', async () => {
    const [callES, esMock] = setupMockEsCompositeQuery<BucketKey, BucketItemCriteria, BucketItem>(
      [],
      genBucketItem
    );
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
    await getMonitorStatus({
      callES,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      filters: exampleFilter,
      locations: [],
      numTimes: 5,
      timerange: {
        from: 'now-10m',
        to: 'now-1m',
      },
    });
    expect(esMock.callAsCurrentUser).toHaveBeenCalledTimes(1);
    const [method, params] = esMock.callAsCurrentUser.mock.calls[0];
    expect(method).toEqual('search');
    expect(params).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "aggs": Object {
            "monitors": Object {
              "composite": Object {
                "size": 2000,
                "sources": Array [
                  Object {
                    "monitor_id": Object {
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
                  "term": Object {
                    "monitor.status": "down",
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
                      "gte": "now-10m",
                      "lte": "now-1m",
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

  it('applies locations to params', async () => {
    const [callES, esMock] = setupMockEsCompositeQuery<BucketKey, BucketItemCriteria, BucketItem>(
      [],
      genBucketItem
    );
    await getMonitorStatus({
      callES,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      locations: ['fairbanks', 'harrisburg'],
      numTimes: 1,
      timerange: {
        from: 'now-2m',
        to: 'now',
      },
    });
    expect(esMock.callAsCurrentUser).toHaveBeenCalledTimes(1);
    const [method, params] = esMock.callAsCurrentUser.mock.calls[0];
    expect(method).toEqual('search');
    expect(params).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "aggs": Object {
            "monitors": Object {
              "composite": Object {
                "size": 2000,
                "sources": Array [
                  Object {
                    "monitor_id": Object {
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
                  "term": Object {
                    "monitor.status": "down",
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
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
        "index": "heartbeat-8*",
      }
    `);
  });

  it('fetches single page of results', async () => {
    const [callES, esMock] = setupMockEsCompositeQuery<BucketKey, BucketItemCriteria, BucketItem>(
      [
        {
          bucketCriteria: [
            {
              monitor_id: 'foo',
              status: 'down',
              location: 'fairbanks',
              doc_count: 43,
            },
            {
              monitor_id: 'bar',
              status: 'down',
              location: 'harrisburg',
              doc_count: 53,
            },
            {
              monitor_id: 'foo',
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
      timerange: {
        from: 'now-12m',
        to: 'now-2m',
      },
    };
    const result = await getMonitorStatus({
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
              "composite": Object {
                "size": 2000,
                "sources": Array [
                  Object {
                    "monitor_id": Object {
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
                  "term": Object {
                    "monitor.status": "down",
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
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
        "index": "heartbeat-8*",
      }
    `);

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "count": 43,
          "location": "fairbanks",
          "monitor_id": "foo",
          "status": "down",
        },
        Object {
          "count": 53,
          "location": "harrisburg",
          "monitor_id": "bar",
          "status": "down",
        },
        Object {
          "count": 44,
          "location": "harrisburg",
          "monitor_id": "foo",
          "status": "down",
        },
      ]
    `);
  });

  it('fetches multiple pages of ES results', async () => {
    const criteria = [
      {
        after_key: {
          monitor_id: 'foo',
          location: 'harrisburg',
          status: 'down',
        },
        bucketCriteria: [
          {
            monitor_id: 'foo',
            status: 'down',
            location: 'fairbanks',
            doc_count: 43,
          },
          {
            monitor_id: 'bar',
            status: 'down',
            location: 'harrisburg',
            doc_count: 53,
          },
          {
            monitor_id: 'foo',
            status: 'down',
            location: 'harrisburg',
            doc_count: 44,
          },
        ],
      },
      {
        after_key: {
          monitor_id: 'bar',
          status: 'down',
          location: 'fairbanks',
        },
        bucketCriteria: [
          {
            monitor_id: 'sna',
            status: 'down',
            location: 'fairbanks',
            doc_count: 21,
          },
          {
            monitor_id: 'fu',
            status: 'down',
            location: 'fairbanks',
            doc_count: 21,
          },
          {
            monitor_id: 'bar',
            status: 'down',
            location: 'fairbanks',
            doc_count: 45,
          },
        ],
      },
      {
        bucketCriteria: [
          {
            monitor_id: 'sna',
            status: 'down',
            location: 'harrisburg',
            doc_count: 21,
          },
          {
            monitor_id: 'fu',
            status: 'down',
            location: 'harrisburg',
            doc_count: 21,
          },
        ],
      },
    ];
    const [callES] = setupMockEsCompositeQuery<BucketKey, BucketItemCriteria, BucketItem>(
      criteria,
      genBucketItem
    );
    const result = await getMonitorStatus({
      callES,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      locations: [],
      numTimes: 5,
      timerange: {
        from: 'now-10m',
        to: 'now-1m',
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "count": 43,
          "location": "fairbanks",
          "monitor_id": "foo",
          "status": "down",
        },
        Object {
          "count": 53,
          "location": "harrisburg",
          "monitor_id": "bar",
          "status": "down",
        },
        Object {
          "count": 44,
          "location": "harrisburg",
          "monitor_id": "foo",
          "status": "down",
        },
        Object {
          "count": 21,
          "location": "fairbanks",
          "monitor_id": "sna",
          "status": "down",
        },
        Object {
          "count": 21,
          "location": "fairbanks",
          "monitor_id": "fu",
          "status": "down",
        },
        Object {
          "count": 45,
          "location": "fairbanks",
          "monitor_id": "bar",
          "status": "down",
        },
        Object {
          "count": 21,
          "location": "harrisburg",
          "monitor_id": "sna",
          "status": "down",
        },
        Object {
          "count": 21,
          "location": "harrisburg",
          "monitor_id": "fu",
          "status": "down",
        },
      ]
    `);
  });
});
