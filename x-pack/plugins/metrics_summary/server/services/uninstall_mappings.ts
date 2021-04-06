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
import { logMappingError } from './utils/log_mapping_error';
import { logMappingDebug } from './utils/log_mapping_debug';

interface UninstallMappingOptions {
  esClient: ElasticsearchClient;
  mappings: Mappings[];
  prefix: string;
  suffix: string;
  logger: Logger;
}

export const uninstallMappings = async ({
  esClient,
  logger,
  mappings,
  prefix,
  suffix,
}: UninstallMappingOptions): Promise<void> => {
  const indices = mappings.map((mapping) => {
    const { index } = mapping.mappings._meta;
    return computeMappingId({ id: index, prefix, suffix });
  });
  logMappingDebug({
    id: JSON.stringify(indices),
    logger,
    message: 'deleting indices',
  });
  try {
    await esClient.indices.delete({
      allow_no_indices: true,
      ignore_unavailable: true,
      index: indices,
    });
  } catch (error) {
    logMappingError({
      error,
      id: JSON.stringify(indices),
      logger,
      message: 'could not delete index',
      postBody: undefined,
    });
  }
};
