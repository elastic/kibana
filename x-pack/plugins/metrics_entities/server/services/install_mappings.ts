/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

import { Mappings } from '../modules/types';
import type { Logger } from '../../../../../src/core/server';

import {
  computeMappingId,
  getIndexExists,
  logMappingDebug,
  logMappingError,
  logMappingInfo,
} from './utils';

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
            // TODO: Do we want to keep the version as 1.0.0 here? If so then this should be moved into constants
            ...{ created_by: 'metrics_entities', index: mappingId, version: { created: '1.0.0' } },
          },
        },
      },
    };
    if (!exists) {
      try {
        logMappingInfo({ id: mappingId, logger, message: 'does not exist, creating the mapping' });
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
