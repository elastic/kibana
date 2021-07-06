/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, IScopedClusterClient } from 'kibana/server';
import {
  MAPS_NEW_VECTOR_LAYER_META_CREATED_BY,
  CreateDocSourceResp,
  IndexSourceMappings,
  BodySettings,
} from '../../common';
import { IndexPatternsCommonService } from '../../../../../src/plugins/data/server';

const DEFAULT_SETTINGS = { number_of_shards: 1 };
const DEFAULT_META = {
  _meta: {
    created_by: MAPS_NEW_VECTOR_LAYER_META_CREATED_BY,
  },
};
const OPT_IN_DEFAULT_MAPPINGS = {
  '@timestamp': {
    type: 'date',
  },
  user: {
    type: 'keyword',
  },
};

export async function createDocSource(
  index: string,
  applyDefaultMappings: boolean,
  mappings: IndexSourceMappings,
  { asCurrentUser }: IScopedClusterClient,
  indexPatternsService: IndexPatternsCommonService
): Promise<CreateDocSourceResp> {
  try {
    await createIndex(index, applyDefaultMappings, mappings, asCurrentUser);
    const { id: indexPatternId } = await indexPatternsService.createAndSave({ title: index }, true);

    return {
      indexPatternId,
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

async function createIndex(
  indexName: string,
  applyDefaultMappings: boolean,
  mappings: IndexSourceMappings,
  asCurrentUser: ElasticsearchClient
) {
  const body: { mappings: IndexSourceMappings; settings: BodySettings } = {
    mappings: {
      ...DEFAULT_META,
      ...mappings,
      properties: {
        ...mappings.properties,
        ...(applyDefaultMappings ? OPT_IN_DEFAULT_MAPPINGS : {}),
      },
    },
    settings: DEFAULT_SETTINGS,
  };

  await asCurrentUser.indices.create({ index: indexName, body });
}
