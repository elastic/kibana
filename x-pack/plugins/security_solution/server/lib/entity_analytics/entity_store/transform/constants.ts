/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingTypeMapping,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';

export const ENTITY_COMPOSITES_TRANSFORM_ID = 'entity-composites-host-transform';

export const SOURCE_INDEX_PATTERN = 'logs-*';

export const DESTINATION_INDEX_MAPPING: MappingTypeMapping = {
  _meta: {
    created_by: 'security-entity-analytics',
  },
  properties: {
    '@timestamp': {
      type: 'date',
    },
    entity: {
      properties: {
        first_doc_timestamp: {
          type: 'date',
        },
        ip_history: {
          properties: {
            ip: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            timestamp: {
              type: 'date',
            },
          },
        },
        last_doc_timestamp: {
          type: 'date',
        },
        type: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
        latest_os_timestamp: {
          type: 'date',
        },
        latest_os: {
          properties: {
            Ext: {
              properties: {
                variant: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
              },
            },
            kernel: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            family: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            type: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            version: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            platform: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            full: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
          },
        },
      },
    },
    host: {
      properties: {
        name: {
          type: 'keyword',
        },
      },
    },
  },
};

export const getEntityStoreTransform = (opts: {
  sourceIndex: string;
  id: string;
  destinationIndex: string;
}): TransformPutTransformRequest => {
  const { sourceIndex, id, destinationIndex } = opts;
  return {
    transform_id: id,
    source: {
      index: sourceIndex,
      query: {
        range: {
          '@timestamp': {
            gte: 'now-1d',
          },
        },
      },
    },
    pivot: {
      group_by: {
        '@timestamp': {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '1m',
          },
        },
        'host.name': {
          terms: {
            field: 'host.name',
          },
        },
      },
      aggregations: {
        entity: {
          scripted_metric: {
            params: {
              field_history_size: 10,
            },
            init_script: `
                  state.ip_addresses = [];
                  state.latest_os_timestamp = null;
                  state.latest_os = null;
                  state.timestamps = [];
                  `,
            map_script: `
                  def src = params._source;
                  if (doc.containsKey('@timestamp')) {
                    state.timestamps.add(doc['@timestamp'].value)
                  }
                  
                  if (doc.containsKey('host.ip')) {
                    for (ip in doc['host.ip']) {
                      state.ip_addresses.add(["ip": ip, "timestamp": doc['@timestamp'].value])
                    }
                  }
                  
                  if (src.containsKey('host') && src.host.containsKey('os')) {
                    if (state.latest_os_timestamp == null || state.latest_os_timestamp.compareTo(doc['@timestamp'].value) < 0) {
                      state.latest_os_timestamp = doc['@timestamp'].value;
                      state.latest_os = src.host.os;
                    }
                  }
                  `,
            combine_script: `
                  state.timestamps.sort((a, b) -> b.compareTo(a));
                  return state;
                  `,
            reduce_script: `
                  def uniqueIps = new LinkedHashMap();
                  def latest_os = null;
                  def latest_os_timestamp = null;
                  def first_doc_timestamp = null;
                  def last_doc_timestamp = null;
                  
                  for (state in states) {
                    for (ip in state.ip_addresses) {
                      if (!uniqueIps.containsKey(ip.ip) && uniqueIps.size() < params.field_history_size) {
                        uniqueIps.put(ip.ip, ip);
                      }
                    }
                    
                    if (latest_os_timestamp == null || (state.latest_os_timestamp != null && state.latest_os_timestamp.compareTo(latest_os_timestamp) > 0)) {
                      latest_os_timestamp = state.latest_os_timestamp;
                      latest_os = state.latest_os;
                    }
                    
                    if (state.timestamps.size() > 0) {
                      if (first_doc_timestamp == null || state.timestamps[state.timestamps.size() - 1].compareTo(first_doc_timestamp) < 0) {
                        first_doc_timestamp = state.timestamps[state.timestamps.size() - 1];
                      }
                      if (last_doc_timestamp == null || state.timestamps[0].compareTo(last_doc_timestamp) > 0) {
                        last_doc_timestamp = state.timestamps[0];
                      }
                    }
                  }
                  
                  def ips_to_return = new ArrayList(uniqueIps.values());
                  ips_to_return.sort((a, b) -> b.timestamp.compareTo(a.timestamp));
                  
                  return [
                    'latest_os_timestamp': latest_os_timestamp,
                    'latest_os': latest_os,
                    'ip_history': ips_to_return, 
                    'first_doc_timestamp': first_doc_timestamp, 
                    'last_doc_timestamp': last_doc_timestamp, 
                    'type' : 'host'
                  ];
                  `,
          },
        },
      },
    },
    dest: {
      index: destinationIndex,
    },
    sync: {
      time: {
        field: '@timestamp',
      },
    },
    retention_policy: {
      time: {
        field: '@timestamp.max',
        max_age: '10m',
      },
    },
  };
};
