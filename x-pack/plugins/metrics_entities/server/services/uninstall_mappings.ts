/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

import { Mappings } from '../modules/types';
import type { Logger } from '../../../../../src/core/server';

import { computeMappingId, logMappingInfo } from './utils';
import { logMappingError } from './utils/log_mapping_error';

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
  logMappingInfo({
    id: indices.join(),
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
      id: indices.join(),
      logger,
      message: 'could not delete index',
      postBody: undefined,
    });
  }
};
