/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  ClusterPutComponentTemplateResponse,
  ClusterPutSettingsResponse,
  IndicesPutIndexTemplateResponse,
  IlmPutLifecycleResponse,
} from '@elastic/elasticsearch/lib/api/types';
import IlmApi from '@elastic/elasticsearch/lib/api/api/ilm';
import ClusterApi from '@elastic/elasticsearch/lib/api/api/cluster';
import IndicesApi from '@elastic/elasticsearch/lib/api/api/indices';

export async function applySetup(client: ElasticsearchClient): Promise<any> {
  return putClusterSettings(client.cluster)
    .then(() => {
      return ilmPolicy(client.ilm);
    })
    .then(() => {
      return componentTemplates(client.cluster).then((response) => {
        response.filter((r) => {
          if (!r.acknowledged) {
            throw new Error('incomplete component templates setup');
          }
        });
      });
    })
    .then(() => {
      return putIndexTemplates(client.indices);
    })
    .catch((error) => {
      throw new Error(error);
    });
}

async function ilmPolicy(api: IlmApi): Promise<IlmPutLifecycleResponse> {
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

async function putClusterSettings(client: ClusterApi): Promise<ClusterPutSettingsResponse> {
  return client.putSettings({
    persistent: {
      search: {
        max_buckets: 150000,
      },
    },
  });
}
async function componentTemplates(
  client: ClusterApi
): Promise<ClusterPutComponentTemplateResponse[]> {
  // TODO: how to read files from a JSON resource instead of inlining here?
  return Promise.all([
    client.putComponentTemplate({
      name: 'profiling-ilm',
      // for idempotency, we allow overwriting the component templates
      create: false,
      template: {
        settings: {
          index: {
            lifecycle: {
              name: 'profiling',
            },
          },
        },
      },
    }),
    client.putComponentTemplate({
      name: 'profiling-events',
      // for idempotency, we allow overwriting the component templates
      create: false,
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
    }),
    client.putComponentTemplate({
      name: 'profiling-executables',
      // for idempotency, we allow overwriting the component templates
      create: false,
      template: {
        settings: {
          index: {
            refresh_interval: '10s',
          },
        },
        mappings: {
          _source: {
            mode: 'synthetic',
          },
          properties: {
            'ecs.version': {
              type: 'keyword',
              index: true,
            },
            'Executable.build.id': {
              type: 'keyword',
              index: true,
            },
            'Executable.file.name': {
              type: 'keyword',
              index: true,
            },
            '@timestamp': {
              type: 'date',
              format: 'epoch_second',
            },
          },
        },
      },
    }),
    client.putComponentTemplate({
      name: 'profiling-stackframes',
      // for idempotency, we allow overwriting the component templates
      create: false,
      template: {
        settings: {
          index: {
            number_of_shards: 16,
            refresh_interval: '10s',
          },
        },
        mappings: {
          _source: {
            mode: 'synthetic',
          },
          properties: {
            'ecs.version': {
              type: 'keyword',
              index: true,
            },
            'Stackframe.line.number': {
              type: 'integer',
              index: false,
            },
            'Stackframe.file.name': {
              type: 'keyword',
              index: false,
            },
            'Stackframe.source.type': {
              type: 'short',
              index: false,
            },
            'Stackframe.function.name': {
              type: 'keyword',
              index: false,
            },
            'Stackframe.function.offset': {
              type: 'integer',
              index: false,
            },
          },
        },
      },
    }),
    client.putComponentTemplate({
      name: 'profiling-stacktraces',
      // for idempotency, we allow overwriting the component templates
      create: false,
      template: {
        settings: {
          index: {
            number_of_shards: 16,
            refresh_interval: '10s',
          },
        },
        mappings: {
          _source: {
            mode: 'synthetic',
          },
          properties: {
            'ecs.version': {
              type: 'keyword',
              index: true,
            },
            'Stacktrace.frame.ids': {
              type: 'keyword',
              index: false,
            },
            'Stacktrace.frame.types': {
              type: 'keyword',
              index: false,
            },
          },
        },
      },
    }),
  ]);
}

// Apply the index templates for data streams and K/V lookup indices.
async function putIndexTemplates(client: IndicesApi): Promise<IndicesPutIndexTemplateResponse[]> {
  const subSampledIndicesIdx = Array.from(Array(11).keys(), (item: number) => item + 1);
  const subSampledIndexName = (pow: number): string => {
    return `profiling-events-5pow${String(pow).padStart(2, '0')}`;
  };
  // Generate all the possible index template names
  const eventsIndices = ['profiling-events-all'].concat(
    subSampledIndicesIdx.map((pow) => subSampledIndexName(pow))
  );

  return Promise.all(
    eventsIndices
      .map((name) =>
        client.putIndexTemplate({
          name,
          // Fail if the index template already exists
          create: true,
          index_patterns: [name + '*'],
          data_stream: {
            hidden: false,
          },
          composed_of: ['profiling-events', 'profiling-ilm'],
          priority: 100,
          _meta: {
            description: `Index template for ${name}`,
          },
        })
      )
      .concat(
        ['profiling-executables', 'profiling-stacktraces', 'profiling-stackframes'].map((name) =>
          client.putIndexTemplate({
            name,
            // Fail if the index template already exists
            create: true,
            index_patterns: [name + '*'],
            composed_of: [name],
            _meta: {
              description: `Index template for ${name}`,
            },
          })
        )
      )
  );
}
