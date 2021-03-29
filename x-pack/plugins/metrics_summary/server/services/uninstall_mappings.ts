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

interface DeleteMappingOptions {
  esClient: ElasticsearchClient;
  mappings: Mappings[];
  moduleName: string;
  prefix: string;
  suffix: string;
}

export const uninstallMappings = async ({
  esClient,
  mappings,
  moduleName,
  prefix,
  suffix,
}: DeleteMappingOptions): Promise<void> => {
  const indices = mappings.map((mapping) => {
    const { index } = mapping.mappings._meta;
    const mappingId = computeMappingId({ id: index, moduleName, prefix, suffix });
    return mappingId;
  });
  try {
    await esClient.indices.delete({
      allow_no_indices: true,
      ignore_unavailable: true,
      index: indices,
    });
  } catch (error) {
    // TODO: Logging statement goes here
  }
};
