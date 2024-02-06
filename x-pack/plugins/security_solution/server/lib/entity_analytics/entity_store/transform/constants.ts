/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';

export const ENTITY_COMPOSITES_TRANSFORM_ID = 'entity-composites-host-transform';

export const SOURCE_INDEX_PATTERN = 'logs-*';

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
                  state.timestamps = [];
                  `,
            map_script: `
                  if(doc.containsKey('@timestamp')){
                      state.timestamps.add(doc['@timestamp'][0])
                  }
                  if(doc.containsKey('host.ip')){
                      doc['host.ip'].each((ip) ->
                          state.ip_addresses.add([ "ip": ip, "timestamp": doc['@timestamp'][0] ])
                      )
                  }
                  `,
            combine_script: `
                  state.timestamps.sort((a, b) -> b.compareTo(a));
                  return state;
                  `,
            reduce_script: `
                  def sorted_flattened_ips = states.stream()
                      .map((state) -> state.ip_addresses)
                      .flatMap(Collection::stream)
                      .sorted((a, b) -> b.timestamp.compareTo(a.timestamp))
                      .collect(Collectors.toList());
                  
                  def ips_to_return = new ArrayList();
                  
                  for (ip in sorted_flattened_ips) {
                      if (ips_to_return.size() < params.field_history_size) {
                      def isUnique = !ips_to_return.any((it) -> it['ip'] == ip['ip']);
                      if (isUnique) {
                          ips_to_return.add(ip);
                      }
                      }
                  }
                  def first_doc_timestamp = null;
                  def last_doc_timestamp = null;
                  
                  for (state in states) {
                      def state_last_doc_timestamp = state.timestamps[0];
                      def state_first_doc_timestamp = state.timestamps[state.timestamps.size() - 1];
                      
                      if(first_doc_timestamp == null || state_first_doc_timestamp.compareTo(first_doc_timestamp)){
                      first_doc_timestamp = state_first_doc_timestamp
                      }
                      
                      if(last_doc_timestamp == null || state_last_doc_timestamp.compareTo(last_doc_timestamp)){
                      last_doc_timestamp = state_last_doc_timestamp
                      }
                  }
  
                  return ['ip_history': ips_to_return, 'first_doc_timestamp': first_doc_timestamp, 'last_doc_timestamp': last_doc_timestamp, 'type' : 'host'];
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
