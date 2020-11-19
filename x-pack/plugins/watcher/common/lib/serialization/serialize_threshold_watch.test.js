/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { serializeThresholdWatch } from './serialize_threshold_watch';

describe('serializeThresholdWatch', () => {
  it('serializes with name', () => {
    expect(
      serializeThresholdWatch({
        name: 'test',
        triggerIntervalSize: 10,
        triggerIntervalUnit: 's',
        index: 'myIndex',
        timeWindowSize: 20,
        timeWindowUnit: 's',
        timeField: 'myTimeField',
        aggType: 'myAggType',
        aggField: 'myAggField',
        termField: 'myTermField',
        termSize: 30,
        termOrder: 40,
        thresholdComparator: 'between',
        hasTermsAgg: true,
        threshold: 50,
        actions: [],
      })
    ).toEqual({
      trigger: {
        schedule: {
          interval: '10s',
        },
      },
      input: {
        search: {
          request: {
            body: {
              size: 0,
              query: {
                bool: {
                  filter: {
                    range: {
                      myTimeField: {
                        gte: '{{ctx.trigger.scheduled_time}}||-20s',
                        lte: '{{ctx.trigger.scheduled_time}}',
                        format: 'strict_date_optional_time||epoch_millis',
                      },
                    },
                  },
                },
              },
              aggs: {
                bucketAgg: {
                  terms: {
                    field: 'myTermField',
                    size: 30,
                    order: {
                      metricAgg: 40,
                    },
                  },
                  aggs: {
                    metricAgg: {
                      myAggType: {
                        field: 'myAggField',
                      },
                    },
                  },
                },
              },
            },
            indices: ['myIndex'],
          },
        },
      },
      condition: {
        script: {
          source:
            "ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets; for (int i = 0; i < arr.length; i++) { if (arr[i]['metricAgg'].value >= params.threshold[0] && arr[i]['metricAgg'].value <= params.threshold[1]) { return true; } } return false;",
          params: {
            threshold: 50,
          },
        },
      },
      transform: {
        script: {
          source:
            "HashMap result = new HashMap(); ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets; ArrayList filteredHits = new ArrayList(); for (int i = 0; i < arr.length; i++) { HashMap filteredHit = new HashMap(); filteredHit.key = arr[i].key; filteredHit.value = arr[i]['metricAgg'].value; if (filteredHit.value >= params.threshold[0] && filteredHit.value <= params.threshold[1]) { filteredHits.add(filteredHit); } } result.results = filteredHits; return result;",
          params: {
            threshold: 50,
          },
        },
      },
      actions: {},
      metadata: {
        xpack: {
          type: 'threshold',
        },
        watcherui: {
          index: 'myIndex',
          time_field: 'myTimeField',
          trigger_interval_size: 10,
          trigger_interval_unit: 's',
          agg_type: 'myAggType',
          agg_field: 'myAggField',
          term_size: 30,
          term_field: 'myTermField',
          threshold_comparator: 'between',
          time_window_size: 20,
          time_window_unit: 's',
          threshold: 50,
        },
        name: 'test',
      },
    });
  });

  it('serializes without name', () => {
    expect(
      serializeThresholdWatch({
        triggerIntervalSize: 10,
        triggerIntervalUnit: 's',
        index: 'myIndex',
        timeWindowSize: 20,
        timeWindowUnit: 's',
        timeField: 'myTimeField',
        aggType: 'myAggType',
        aggField: 'myAggField',
        termField: 'myTermField',
        termSize: 30,
        termOrder: 40,
        thresholdComparator: 'between',
        hasTermsAgg: true,
        threshold: 50,
        actions: [],
      })
    ).toEqual({
      trigger: {
        schedule: {
          interval: '10s',
        },
      },
      input: {
        search: {
          request: {
            body: {
              size: 0,
              query: {
                bool: {
                  filter: {
                    range: {
                      myTimeField: {
                        gte: '{{ctx.trigger.scheduled_time}}||-20s',
                        lte: '{{ctx.trigger.scheduled_time}}',
                        format: 'strict_date_optional_time||epoch_millis',
                      },
                    },
                  },
                },
              },
              aggs: {
                bucketAgg: {
                  terms: {
                    field: 'myTermField',
                    size: 30,
                    order: {
                      metricAgg: 40,
                    },
                  },
                  aggs: {
                    metricAgg: {
                      myAggType: {
                        field: 'myAggField',
                      },
                    },
                  },
                },
              },
            },
            indices: ['myIndex'],
          },
        },
      },
      condition: {
        script: {
          source:
            "ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets; for (int i = 0; i < arr.length; i++) { if (arr[i]['metricAgg'].value >= params.threshold[0] && arr[i]['metricAgg'].value <= params.threshold[1]) { return true; } } return false;",
          params: {
            threshold: 50,
          },
        },
      },
      transform: {
        script: {
          source:
            "HashMap result = new HashMap(); ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets; ArrayList filteredHits = new ArrayList(); for (int i = 0; i < arr.length; i++) { HashMap filteredHit = new HashMap(); filteredHit.key = arr[i].key; filteredHit.value = arr[i]['metricAgg'].value; if (filteredHit.value >= params.threshold[0] && filteredHit.value <= params.threshold[1]) { filteredHits.add(filteredHit); } } result.results = filteredHits; return result;",
          params: {
            threshold: 50,
          },
        },
      },
      actions: {},
      metadata: {
        xpack: {
          type: 'threshold',
        },
        watcherui: {
          index: 'myIndex',
          time_field: 'myTimeField',
          trigger_interval_size: 10,
          trigger_interval_unit: 's',
          agg_type: 'myAggType',
          agg_field: 'myAggField',
          term_size: 30,
          term_field: 'myTermField',
          threshold_comparator: 'between',
          time_window_size: 20,
          time_window_unit: 's',
          threshold: 50,
        },
      },
    });
  });

  it('excludes metadata when includeMetadata is false', () => {
    expect(
      serializeThresholdWatch({
        triggerIntervalSize: 10,
        triggerIntervalUnit: 's',
        index: 'myIndex',
        timeWindowSize: 20,
        timeWindowUnit: 's',
        timeField: 'myTimeField',
        aggType: 'myAggType',
        aggField: 'myAggField',
        termField: 'myTermField',
        termSize: 30,
        termOrder: 40,
        thresholdComparator: 'between',
        hasTermsAgg: true,
        threshold: 50,
        actions: [],
        includeMetadata: false,
      })
    ).toEqual({
      trigger: {
        schedule: {
          interval: '10s',
        },
      },
      input: {
        search: {
          request: {
            body: {
              size: 0,
              query: {
                bool: {
                  filter: {
                    range: {
                      myTimeField: {
                        gte: '{{ctx.trigger.scheduled_time}}||-20s',
                        lte: '{{ctx.trigger.scheduled_time}}',
                        format: 'strict_date_optional_time||epoch_millis',
                      },
                    },
                  },
                },
              },
              aggs: {
                bucketAgg: {
                  terms: {
                    field: 'myTermField',
                    size: 30,
                    order: {
                      metricAgg: 40,
                    },
                  },
                  aggs: {
                    metricAgg: {
                      myAggType: {
                        field: 'myAggField',
                      },
                    },
                  },
                },
              },
            },
            indices: ['myIndex'],
          },
        },
      },
      condition: {
        script: {
          source:
            "ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets; for (int i = 0; i < arr.length; i++) { if (arr[i]['metricAgg'].value >= params.threshold[0] && arr[i]['metricAgg'].value <= params.threshold[1]) { return true; } } return false;",
          params: {
            threshold: 50,
          },
        },
      },
      transform: {
        script: {
          source:
            "HashMap result = new HashMap(); ArrayList arr = ctx.payload.aggregations.bucketAgg.buckets; ArrayList filteredHits = new ArrayList(); for (int i = 0; i < arr.length; i++) { HashMap filteredHit = new HashMap(); filteredHit.key = arr[i].key; filteredHit.value = arr[i]['metricAgg'].value; if (filteredHit.value >= params.threshold[0] && filteredHit.value <= params.threshold[1]) { filteredHits.add(filteredHit); } } result.results = filteredHits; return result;",
          params: {
            threshold: 50,
          },
        },
      },
      actions: {},
    });
  });
});
