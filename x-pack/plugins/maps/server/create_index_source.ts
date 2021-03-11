/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { INDEX_META_DATA_CREATED_BY, CreateIndexSourceResp, IndexSourceMappings, BodySettings } from '../common';
import { IndexPatternsService } from '../../../../src/plugins/data/common';

const DEFAULT_SETTINGS = { number_of_shards: 1 };
const DEFAULT_MAPPINGS = {
  _meta: {
    created_by: INDEX_META_DATA_CREATED_BY,
  },
};

export async function createIndexSource(
  index: string,
  mappings: IndexSourceMappings,
  { asCurrentUser }: IScopedClusterClient,
  indexPatternsService: IndexPatternsService
): Promise<CreateIndexSourceResp> {
  try {
    await createIndex(index, mappings);
    await indexPatternsService.createAndSave(
      {
        title: index,
      },
      true
    );

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

async function createIndex(indexName: string, mappings: Mappings) {
  const body: { mappings: IndexSourceMappings; settings: BodySettings } = {
    mappings: {
      ...DEFAULT_MAPPINGS,
      ...mappings,
    },
    settings: DEFAULT_SETTINGS,
  };

  await asCurrentUser.indices.create({ index: indexName, body });
}
