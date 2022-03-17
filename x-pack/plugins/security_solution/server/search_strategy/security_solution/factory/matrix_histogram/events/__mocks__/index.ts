/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MatrixHistogramQuery,
  MatrixHistogramRequestOptions,
  MatrixHistogramType,
} from '../../../../../../../common/search_strategy';

const runtimeMappings: MatrixHistogramRequestOptions['runtimeMappings'] = {
  '@a.runtime.field': {
    script: {
      source: 'emit("Radically mocked dude: " + doc[\'host.name\'].value)',
    },
    type: 'keyword',
  },
};

export const mockOptions: MatrixHistogramRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  factoryQueryType: MatrixHistogramQuery,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  histogramType: MatrixHistogramType.events,
  timerange: { interval: '12h', from: '2020-09-08T16:11:26.215Z', to: '2020-09-09T16:11:26.215Z' },
  stackByField: 'event.action',
  runtimeMappings,
};

export const expectedDsl = {
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  allow_no_indices: true,
  ignore_unavailable: true,
  track_total_hits: true,
  body: {
    aggregations: {
      eventActionGroup: {
        terms: {
          field: 'event.action',
          missing: 'All others',
          order: { _count: 'desc' },
          size: 10,
        },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599581486215, max: 1599667886215 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  },
};

export const expectedThresholdDsl = {
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  allow_no_indices: true,
  ignore_unavailable: true,
  track_total_hits: true,
  body: {
    aggregations: {
      eventActionGroup: {
        terms: {
          script: {
            lang: 'painless',
            source: "doc['host.name'].value + ':' + doc['agent.name'].value",
          },
          order: { _count: 'desc' },
          size: 10,
        },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 200,
              extended_bounds: { min: 1599581486215, max: 1599667886215 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  },
};

export const expectedThresholdMissingFieldDsl = {
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  allow_no_indices: true,
  ignore_unavailable: true,
  track_total_hits: true,
  body: {
    aggregations: {
      eventActionGroup: {
        terms: {
          field: 'event.action',
          missing: 'All others',
          order: { _count: 'desc' },
          size: 10,
        },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 200,
              extended_bounds: { min: 1599581486215, max: 1599667886215 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  },
};

export const expectedThresholdWithCardinalityDsl = {
  allow_no_indices: true,
  body: {
    aggregations: {
      eventActionGroup: {
        aggs: {
          cardinality_check: {
            bucket_selector: {
              buckets_path: { cardinalityCount: 'cardinality_count' },
              script: 'params.cardinalityCount >= 10',
            },
          },
          cardinality_count: { cardinality: { field: 'agent.name' } },
          events: {
            date_histogram: {
              extended_bounds: { max: 1599667886215, min: 1599581486215 },
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 200,
            },
          },
        },
        terms: {
          field: 'event.action',
          missing: 'All others',
          order: { _count: 'desc' },
          size: 10,
        },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } },
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  },
  ignore_unavailable: true,
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  track_total_hits: true,
};

export const expectedThresholdWithGroupFieldsAndCardinalityDsl = {
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  allow_no_indices: true,
  ignore_unavailable: true,
  track_total_hits: true,
  body: {
    aggregations: {
      eventActionGroup: {
        terms: {
          script: {
            lang: 'painless',
            source: "doc['host.name'].value + ':' + doc['agent.name'].value",
          },
          order: { _count: 'desc' },
          size: 10,
        },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 200,
              extended_bounds: { min: 1599581486215, max: 1599667886215 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  },
};

export const expectedThresholdGroupWithCardinalityDsl = {
  allow_no_indices: true,
  body: {
    aggregations: {
      eventActionGroup: {
        aggs: {
          cardinality_check: {
            bucket_selector: {
              buckets_path: { cardinalityCount: 'cardinality_count' },
              script: 'params.cardinalityCount >= 10',
            },
          },
          cardinality_count: { cardinality: { field: 'agent.name' } },
          events: {
            date_histogram: {
              extended_bounds: { max: 1599667886215, min: 1599581486215 },
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 200,
            },
          },
        },
        terms: {
          order: { _count: 'desc' },
          script: {
            lang: 'painless',
            source: "doc['host.name'].value + ':' + doc['agent.name'].value",
          },
          size: 10,
        },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } },
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  },
  ignore_unavailable: true,
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  track_total_hits: true,
};

export const expectedIpIncludingMissingDataDsl = {
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  allow_no_indices: true,
  ignore_unavailable: true,
  track_total_hits: true,
  body: {
    aggregations: {
      eventActionGroup: {
        terms: {
          field: 'source.ip',
          missing: '0.0.0.0',
          value_type: 'ip',
          order: { _count: 'desc' },
          size: 10,
        },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599581486215, max: 1599667886215 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          {
            bool: {
              must: [],
              filter: [{ match_all: {} }],
              should: [],
              must_not: [{ exists: { field: 'source.ip' } }],
            },
          },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  },
};

export const expectedIpNotIncludingMissingDataDsl = {
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  allow_no_indices: true,
  ignore_unavailable: true,
  track_total_hits: true,
  body: {
    aggregations: {
      eventActionGroup: {
        terms: { field: 'source.ip', order: { _count: 'desc' }, size: 10, value_type: 'ip' },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599581486215, max: 1599667886215 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          {
            bool: {
              must: [],
              filter: [{ match_all: {} }],
              should: [],
              must_not: [],
            },
          },
          { exists: { field: 'source.ip' } },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  },
};
