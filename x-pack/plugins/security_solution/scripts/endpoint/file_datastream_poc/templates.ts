/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

interface IndexTemplateDefinition {
  name: string;
  template: estypes.IndicesIndexTemplate;
}

export const getFileMetaDataStreamIndexTemplate = (): IndexTemplateDefinition => {
  return {
    name: 'paul-filedelivery-meta',
    template: {
      index_patterns: ['paul-filedelivery-meta-*-*'],
      priority: 200,
      composed_of: [],
      _meta: {
        description: 'fleet file delivery index template',
        managed: true,
      },
      template: {
        settings: {
          'index.auto_expand_replicas': '0-1',
          // 'index.lifecycle.name': '.fleet-filedelivery-meta-ilm-policy',
          'index.hidden': true,
        },
        mappings: {
          _meta: {
            version: '1',
          },
          dynamic: false,
          properties: {
            agent_id: {
              type: 'keyword',
            },
            '@timestamp': {
              type: 'date',
            },
            action_id: {
              type: 'keyword',
            },
            source: {
              type: 'keyword',
            },
            file: {
              properties: {
                Status: {
                  type: 'keyword',
                },
                ChunkSize: {
                  type: 'integer',
                },
                Compression: {
                  type: 'keyword',
                },
                name: {
                  type: 'keyword',
                },
                Meta: {
                  properties: {
                    target_agents: {
                      type: 'keyword',
                    },
                  },
                },
              },
            },
          },
        },
      },
      version: 1,
    },
  };
};

export const getFileDataChunkDataStreamIndexTemplate = (): IndexTemplateDefinition => {
  return {
    name: 'paul-filedelivery-data',
    template: {
      index_patterns: ['paul-filedelivery-data-*-*'],
      priority: 200,
      composed_of: [],
      _meta: {
        description: 'fleet file delivery data index template',
        managed: true,
      },
      data_stream: {},
      template: {
        settings: {
          'index.auto_expand_replicas': '0-1',
          // 'index.lifecycle.name': '.fleet-filedelivery-data-ilm-policy',
          'index.hidden': true,
        },
        mappings: {
          _meta: {
            version: '1',
          },
          properties: {
            data: {
              type: 'binary',
              store: true,
            },
            bid: {
              type: 'keyword',
            },
            sha2: {
              type: 'keyword',
              index: false,
            },
            last: {
              type: 'boolean',
              index: false,
            },
            '@timestamp': {
              type: 'date',
            },
          },
        },
      },
      version: 1,
    },
  };
};
