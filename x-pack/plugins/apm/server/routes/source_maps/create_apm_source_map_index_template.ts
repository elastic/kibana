/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createOrUpdateIndexTemplate } from '@kbn/observability-plugin/server';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/get_apm_indices';

const indexTemplate: IndicesPutIndexTemplateRequest = {
  name: 'apm-source-map',
  body: {
    version: 1,
    index_patterns: [APM_SOURCE_MAP_INDEX],
    template: {
      settings: {
        number_of_shards: 1,
        index: {
          hidden: true,
        },
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          fleet_id: {
            type: 'keyword',
          },
          created: {
            type: 'date',
          },
          content: {
            type: 'binary',
          },
          content_sha256: {
            type: 'keyword',
          },
          'file.path': {
            type: 'keyword',
          },
          'service.name': {
            type: 'keyword',
          },
          'service.version': {
            type: 'keyword',
          },
        },
      },
    },
  },
};

export async function createApmSourceMapIndexTemplate({
  client,
  logger,
}: {
  client: ElasticsearchClient;
  logger: Logger;
}) {
  // create index template
  await createOrUpdateIndexTemplate({ indexTemplate, client, logger });

  // create index if it doesn't exist
  const indexExists = await client.indices.exists({
    index: APM_SOURCE_MAP_INDEX,
  });

  if (!indexExists) {
    logger.debug(`Create index: "${APM_SOURCE_MAP_INDEX}"`);
    await client.indices.create({ index: APM_SOURCE_MAP_INDEX });
  }
}

export interface ApmSourceMap {
  fleet_id: string;
  created: string;
  content: string;
  content_sha256: string;
  file: {
    path: string;
  };
  service: {
    name: string;
    version: string;
  };
}
