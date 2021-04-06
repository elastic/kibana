/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';

import { Mappings } from '../modules/types';
import type { Logger } from '../../../../../src/core/server';

import { computeMappingId } from './utils';
import { getIndexExists } from './utils/get_index_exists';
import { logMappingDebug } from './utils/log_mapping_debug';
import { logMappingError } from './utils/log_mapping_error';

interface CreateMappingOptions {
  esClient: ElasticsearchClient;
  mappings: Mappings[];
  prefix: string;
  suffix: string;
  logger: Logger;
}

export const installMappings = async ({
  esClient,
  mappings,
  prefix,
  suffix,
  logger,
}: CreateMappingOptions): Promise<void> => {
  for (const mapping of mappings) {
    const { index } = mapping.mappings._meta;
    const mappingId = computeMappingId({ id: index, prefix, suffix });
    const exists = await getIndexExists(esClient, mappingId);
    const computedBody = {
      ...mapping,
      ...{
        mappings: {
          ...mapping.mappings,
          _meta: {
            ...mapping.mappings._meta,
            ...{ created_by: 'metrics_entities', index: mappingId, version: { created: '1.0.0' } },
          },
        },
      },
    };
    if (!exists) {
      try {
        logMappingDebug({ id: mappingId, logger, message: 'does not exist, creating the mapping' });
        await esClient.indices.create({
          body: computedBody,
          index: mappingId,
        });
      } catch (error) {
        logMappingError({
          error,
          id: mappingId,
          logger,
          message: 'cannot install mapping',
          postBody: computedBody,
        });
      }
    } else {
      logMappingDebug({
        id: mappingId,
        logger,
        message: 'mapping already exists. It will not be recreated',
      });
    }
  }
};
