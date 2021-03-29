/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';

import { Mappings } from '../modules/types';

import { computeMappingId } from './utils';
import { getIndexExists } from './utils/get_index_exists';

interface CreateMappingOptions {
  esClient: ElasticsearchClient;
  mappings: Mappings[];
  moduleName: string;
  prefix: string;
  suffix: string;
}

export const installMappings = async ({
  esClient,
  mappings,
  moduleName,
  prefix,
  suffix,
}: CreateMappingOptions): Promise<void> => {
  for (const mapping of mappings) {
    const { index } = mapping.mappings._meta;
    const mappingId = computeMappingId({ id: index, moduleName, prefix, suffix });
    const exists = await getIndexExists(esClient, mappingId);
    const computedBody = {
      ...mapping,
      ...{
        mappings: {
          ...mapping.mappings,
          _meta: {
            ...mapping.mappings._meta,
            ...{ created_by: 'metrics_summary', index: mappingId, version: { created: '1.0.0' } },
          },
        },
      },
    };
    if (!exists) {
      try {
        await esClient.indices.create({
          body: computedBody,
          index: mappingId,
        });
      } catch (error) {
        // TODO: Logging statement goes here
      }
    }
  }
};
