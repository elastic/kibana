/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ClusterPutComponentTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
import IlmApi from '@elastic/elasticsearch/lib/api/api/ilm';

export async function applySetup(client: ElasticsearchClient): Promise<any> {
  return ilm(client.ilm).then(() => {
    componentTemplates(client).then((response) => {
      if (response.acknowledged) {
        return client.indices.putIndexTemplate({
          name: 'profiling-events-all',
          create: true,
          index_patterns: ['profiling-events-all*'],
          composed_of: ['profiling-events', 'profiling-ilm'],
          priority: 100,
          _meta: {
            description: 'Template for profiling-events',
          },
        });
      }
    });
  });
}

async function ilm(api: IlmApi): Promise<any> {
  return api.putLifecycle({
    name: 'profiling',
    policy: {
      phases: {
        hot: {
          min_age: '0ms',
          actions: {
            rollover: {
              max_primary_shard_size: '50gb',
              max_age: '7d',
            },
            set_priority: {
              priority: 100,
            },
          },
        },
        warm: {
          min_age: '30d',
          actions: {
            set_priority: {
              priority: 50,
            },
            shrink: {
              number_of_shards: 2,
            },
          },
        },
        delete: {
          min_age: '60d',
          actions: {
            delete: {
              delete_searchable_snapshot: true,
            },
          },
        },
      },
    },
  });
}

async function componentTemplates(
  client: ElasticsearchClient
): Promise<ClusterPutComponentTemplateResponse> {
  // TODO: how to read files from a resource?
  //  Ideally we'd like these to be stored as plain JSON files.

  await client.cluster.putComponentTemplate({
    name: 'profiling-ilm',
    template: {
      settings: {
        index: {
          lifecycle: {
            name: 'profiling',
          },
        },
      },
    },
  });

  // TODO: return more than 1 execution
  return client.cluster.putComponentTemplate(
    {
      name: 'profiling-events',
      create: true,
      template: {
        settings: {
          index: {
            number_of_shards: '4',
            max_result_window: 150000,
            refresh_interval: '10s',
            sort: {
              field: [
                'service.name',
                '@timestamp',
                'orchestrator.resource.name',
                'container.name',
                'process.thread.name',
                'host.id',
              ],
            },
          },
          codec: 'best_compression',
        },
        mappings: {
          _source: {
            enabled: false,
          },
          properties: {
            'ecs.version': {
              type: 'keyword',
              index: true,
            },
            'service.name': {
              type: 'keyword',
            },
            '@timestamp': {
              type: 'date',
              format: 'epoch_second',
            },
            'host.id': {
              type: 'keyword',
            },
            'Stacktrace.id': {
              type: 'keyword',
              index: false,
            },
            'orchestrator.resource.name': {
              type: 'keyword',
            },
            'container.name': {
              type: 'keyword',
            },
            'process.thread.name': {
              type: 'keyword',
            },
            'Stacktrace.count': {
              type: 'short',
              index: false,
            },
            'agent.version': {
              type: 'keyword',
            },
            'host.ip': {
              type: 'ip',
            },
            'host.ipstring': {
              type: 'keyword',
            },
            'host.name': {
              type: 'keyword',
            },
            'os.kernel': {
              type: 'keyword',
            },
            tags: {
              type: 'keyword',
            },
          },
        },
      },
      _meta: {
        description: 'Mappings for profiling events data stream',
      },
    },
    {}
  );
}
