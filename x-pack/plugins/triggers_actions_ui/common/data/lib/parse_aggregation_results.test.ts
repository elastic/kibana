/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseAggregationResults } from './parse_aggregation_results';

const sampleHit = {
  _index: '.kibana-event-log-8.6.0-000001',
  _id: 'RSPAXYQB0WpSSRUF7Vm1',
  _score: null,
  _source: {
    '@timestamp': '2022-11-09T18:57:14.918Z',
    event: {
      provider: 'alerting',
      action: 'execute-start',
      kind: 'alert',
      category: ['stackAlerts'],
      start: '2022-11-09T18:57:14.918Z',
    },
    kibana: {
      alert: {
        rule: {
          rule_type_id: '.es-query',
          consumer: 'alerts',
          execution: {
            uuid: '52d62e0b-d66e-4739-911f-e3aa96eaa99a',
          },
        },
      },
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'ca8d9770-605f-11ed-8444-a37ecf51689e',
          type_id: '.es-query',
        },
      ],
      space_ids: ['default'],
      task: {
        scheduled: '2022-11-09T18:57:13.614Z',
        schedule_delay: 1304000000,
      },
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.6.0',
    },
    rule: {
      id: 'ca8d9770-605f-11ed-8444-a37ecf51689e',
      license: 'basic',
      category: '.es-query',
      ruleset: 'stackAlerts',
    },
    message: 'rule execution start: "ca8d9770-605f-11ed-8444-a37ecf51689e"',
    ecs: {
      version: '1.8.0',
    },
  },
  fields: {
    '@timestamp': ['2022-11-09T18:57:14.918Z'],
  },
  sort: [1668020234918],
};

describe('parseAggregationResults', () => {
  it('correctly parses results for count over all', () => {
    expect(
      parseAggregationResults({
        isCountAgg: true,
        isGroupAgg: false,
        esResult: {
          took: 238,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: 491,
            max_score: null,
            hits: [sampleHit],
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'all documents',
          count: 491,
          hits: [sampleHit],
        },
      ],
      truncated: false,
    });
  });

  it('correctly parses results for count over top N termField', () => {
    expect(
      parseAggregationResults({
        isCountAgg: true,
        isGroupAgg: true,
        esResult: {
          took: 233,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 643, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 103,
              buckets: [
                {
                  key: 'execute',
                  doc_count: 120,
                },
                {
                  key: 'execute-start',
                  doc_count: 120,
                },
                {
                  key: 'active-instance',
                  doc_count: 100,
                },
                {
                  key: 'execute-action',
                  doc_count: 100,
                },
                {
                  key: 'new-instance',
                  doc_count: 100,
                },
              ],
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'execute',
          count: 120,
          hits: [],
        },
        {
          group: 'execute-start',
          count: 120,
          hits: [],
        },
        {
          group: 'active-instance',
          count: 100,
          hits: [],
        },
        {
          group: 'execute-action',
          count: 100,
          hits: [],
        },
        {
          group: 'new-instance',
          count: 100,
          hits: [],
        },
      ],
      truncated: false,
    });
  });

  it('correctly parses results for count over top N termField with topHits', () => {
    expect(
      parseAggregationResults({
        isCountAgg: true,
        isGroupAgg: true,
        esResult: {
          took: 233,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 643, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 103,
              buckets: [
                {
                  key: 'execute',
                  doc_count: 120,
                  topHitsAgg: {
                    hits: {
                      total: {
                        value: 120,
                        relation: 'eq',
                      },
                      max_score: 0,
                      hits: [sampleHit],
                    },
                  },
                },
                {
                  key: 'execute-start',
                  doc_count: 120,
                  topHitsAgg: {
                    hits: {
                      total: {
                        value: 120,
                        relation: 'eq',
                      },
                      max_score: 0,
                      hits: [sampleHit],
                    },
                  },
                },
                {
                  key: 'active-instance',
                  doc_count: 100,
                  topHitsAgg: {
                    hits: {
                      total: {
                        value: 100,
                        relation: 'eq',
                      },
                      max_score: 0,
                      hits: [sampleHit],
                    },
                  },
                },
                {
                  key: 'execute-action',
                  doc_count: 100,
                  topHitsAgg: {
                    hits: {
                      total: {
                        value: 100,
                        relation: 'eq',
                      },
                      max_score: 0,
                      hits: [sampleHit],
                    },
                  },
                },
                {
                  key: 'new-instance',
                  doc_count: 100,
                  topHitsAgg: {
                    hits: {
                      total: {
                        value: 100,
                        relation: 'eq',
                      },
                      max_score: 0,
                      hits: [sampleHit],
                    },
                  },
                },
              ],
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'execute',
          count: 120,
          hits: [sampleHit],
        },
        {
          group: 'execute-start',
          count: 120,
          hits: [sampleHit],
        },
        {
          group: 'active-instance',
          count: 100,
          hits: [sampleHit],
        },
        {
          group: 'execute-action',
          count: 100,
          hits: [sampleHit],
        },
        {
          group: 'new-instance',
          count: 100,
          hits: [sampleHit],
        },
      ],
      truncated: false,
    });
  });

  it('correctly parses results for aggregate metric over all', () => {
    expect(
      parseAggregationResults({
        isCountAgg: false,
        isGroupAgg: false,
        esResult: {
          took: 238,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 643, max_score: null, hits: [sampleHit] },
          aggregations: {
            metricAgg: {
              value: 3578195238.095238,
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'all documents',
          hits: [sampleHit],
          count: 643,
          value: 3578195238.095238,
        },
      ],
      truncated: false,
    });
  });

  it('correctly parses results for aggregate metric over top N termField', () => {
    expect(
      parseAggregationResults({
        isCountAgg: false,
        isGroupAgg: true,
        esResult: {
          took: 238,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 643, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 240,
              buckets: [
                {
                  key: 'execute-action',
                  doc_count: 120,
                  metricAgg: {
                    value: null,
                  },
                },
                {
                  key: 'execute-start',
                  doc_count: 139,
                  metricAgg: {
                    value: null,
                  },
                },
                {
                  key: 'starting',
                  doc_count: 1,
                  metricAgg: {
                    value: null,
                  },
                },
                {
                  key: 'recovered-instance',
                  doc_count: 120,
                  metricAgg: {
                    value: 12837500000,
                  },
                },
                {
                  key: 'execute',
                  doc_count: 139,
                  metricAgg: {
                    value: 137647482.0143885,
                  },
                },
              ],
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'execute-action',
          count: 120,
          hits: [],
          value: null,
        },
        {
          group: 'execute-start',
          count: 139,
          hits: [],
          value: null,
        },
        {
          group: 'starting',
          count: 1,
          hits: [],
          value: null,
        },
        {
          group: 'recovered-instance',
          count: 120,
          hits: [],
          value: 12837500000,
        },
        {
          group: 'execute',
          count: 139,
          hits: [],
          value: 137647482.0143885,
        },
      ],
      truncated: false,
    });
  });

  it('correctly parses results for aggregate metric over top N termField with topHits', () => {
    expect(
      parseAggregationResults({
        isCountAgg: false,
        isGroupAgg: true,
        esResult: {
          took: 238,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 643, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 240,
              buckets: [
                {
                  key: 'execute-action',
                  doc_count: 120,
                  topHitsAgg: {
                    hits: {
                      total: {
                        value: 120,
                        relation: 'eq',
                      },
                      max_score: 0,
                      hits: [sampleHit],
                    },
                  },
                  metricAgg: {
                    value: null,
                  },
                },
                {
                  key: 'execute-start',
                  doc_count: 139,
                  topHitsAgg: {
                    hits: {
                      total: {
                        value: 139,
                        relation: 'eq',
                      },
                      max_score: 0,
                      hits: [sampleHit],
                    },
                  },
                  metricAgg: {
                    value: null,
                  },
                },
                {
                  key: 'starting',
                  doc_count: 1,
                  topHitsAgg: {
                    hits: {
                      total: {
                        value: 1,
                        relation: 'eq',
                      },
                      max_score: 0,
                      hits: [sampleHit],
                    },
                  },
                  metricAgg: {
                    value: null,
                  },
                },
                {
                  key: 'recovered-instance',
                  doc_count: 120,
                  topHitsAgg: {
                    hits: {
                      total: {
                        value: 120,
                        relation: 'eq',
                      },
                      max_score: 0,
                      hits: [sampleHit],
                    },
                  },
                  metricAgg: {
                    value: 12837500000,
                  },
                },
                {
                  key: 'execute',
                  doc_count: 139,
                  topHitsAgg: {
                    hits: {
                      total: {
                        value: 139,
                        relation: 'eq',
                      },
                      max_score: 0,
                      hits: [sampleHit],
                    },
                  },
                  metricAgg: {
                    value: 137647482.0143885,
                  },
                },
              ],
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'execute-action',
          count: 120,
          hits: [sampleHit],
          value: null,
        },
        {
          group: 'execute-start',
          count: 139,
          hits: [sampleHit],
          value: null,
        },
        {
          group: 'starting',
          count: 1,
          hits: [sampleHit],
          value: null,
        },
        {
          group: 'recovered-instance',
          count: 120,
          hits: [sampleHit],
          value: 12837500000,
        },
        {
          group: 'execute',
          count: 139,
          hits: [sampleHit],
          value: 137647482.0143885,
        },
      ],
      truncated: false,
    });
  });

  it('correctly returns truncated status when resultLimit is reached', () => {
    expect(
      parseAggregationResults({
        isCountAgg: true,
        isGroupAgg: true,
        esResult: {
          took: 233,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 643, max_score: null, hits: [] },
          aggregations: {
            groupAggCount: {
              count: 5,
            },
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 103,
              buckets: [
                {
                  key: 'execute',
                  doc_count: 120,
                },
                {
                  key: 'execute-start',
                  doc_count: 120,
                },
                {
                  key: 'active-instance',
                  doc_count: 100,
                },
                {
                  key: 'execute-action',
                  doc_count: 100,
                },
                {
                  key: 'new-instance',
                  doc_count: 100,
                },
              ],
            },
          },
        },
        resultLimit: 3,
      })
    ).toEqual({
      results: [
        {
          group: 'execute',
          count: 120,
          hits: [],
        },
        {
          group: 'execute-start',
          count: 120,
          hits: [],
        },
        {
          group: 'active-instance',
          count: 100,
          hits: [],
        },
      ],
      truncated: true,
    });
  });
});
