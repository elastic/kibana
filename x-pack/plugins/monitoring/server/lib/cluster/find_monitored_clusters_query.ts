import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import {
  getBeatDataset,
  getElasticsearchDataset,
  getKibanaDataset,
  getLogstashDataset,
} from './get_index_patterns';

export function findMonitoredClustersQuery(options: { start?: number; end?: number }) {
  return {
    query: {
      range: {
        '@timestamp': {
          gte: options.start,
          lte: options.end,
        },
      },
    },
    aggs: {
      cluster_uuid: {
        terms: {
          field: 'cluster_uuid',
          size: 10,
          missing: STANDALONE_CLUSTER_CLUSTER_UUID,
        },
        aggs: {
          elasticsearch: {
            filter: {
              bool: {
                should: [
                  { term: { type: 'cluster_stats' } },
                  { term: { 'metricset.name': 'cluster_stats' } },
                  { term: { 'data_stream.dataset': getElasticsearchDataset('cluster_stats') } },
                ],
              },
            },
            aggs: {
              latest_doc: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                },
              },
            },
          },
          kibana: {
            filter: {
              bool: {
                must: [
                  { exists: { field: 'kibana_stats' } },
                  {
                    bool: {
                      should: [
                        { term: { type: 'kibana_stats' } },
                        { term: { 'metricset.name': 'stats' } },
                        { term: { 'data_stream.dataset': getKibanaDataset('stats') } },
                      ],
                    },
                  },
                ],
              },
            },
            aggs: {
              instance_count: {
                cardinality: {
                  field: 'kibana_stats.kibana.uuid',
                },
              },
            },
          },
          apm: {
            filter: {
              bool: {
                must: [
                  { term: { [`beats_stats.beat.type`]: 'apm-server' } },
                  { exists: { field: 'beats_stats' } },
                  {
                    bool: {
                      should: [
                        { term: { type: 'beats_stats' } },
                        { term: { 'metricset.name': 'stats' } },
                        { term: { 'data_stream.dataset': getBeatDataset('stats') } },
                      ],
                    },
                  },
                ],
              },
            },
            aggs: {
              instance_count: {
                cardinality: {
                  field: 'beats_stats.beat.uuid',
                },
              },
            },
          },
          beats: {
            filter: {
              bool: {
                must_not: { term: { [`beats_stats.beat.type`]: 'apm-server' } },
                must: [
                  { exists: { field: 'beats_stats' } },
                  {
                    bool: {
                      should: [
                        { term: { type: 'beats_stats' } },
                        { term: { 'metricset.name': 'stats' } },
                        { term: { 'data_stream.dataset': getBeatDataset('stats') } },
                      ],
                    },
                  },
                ],
              },
            },
            aggs: {
              instance_count: {
                cardinality: {
                  field: 'beats_stats.beat.uuid',
                },
              },
            },
          },
          logstash: {
            filter: {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'logstash_stats',
                    },
                  },
                  {
                    bool: {
                      should: [
                        { term: { type: 'logstash_stats' } },
                        { term: { 'metricset.name': 'stats' } },
                        { term: { 'data_stream.dataset': getLogstashDataset('stats') } },
                      ],
                    },
                  },
                ],
              },
            },
            aggs: {
              instance_count: {
                cardinality: {
                  field: 'logstash_stats.logstash.uuid',
                },
              },
            },
          },
          enterprisesearch: {
            filter: {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'enterprisesearch',
                    },
                  },
                  {
                    bool: {
                      should: [
                        { term: { 'metricset.name': 'stats' } },
                      ],
                    },
                  },
                ],
              },
            },
            aggs: {
              instance_count: {
                cardinality: {
                  field: 'host.name',
                },
              },
            },
          }
        },
      },
    },
  };
}
