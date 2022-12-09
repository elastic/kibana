/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  createOrUpdateIndex,
  Mappings,
} from '@kbn/observability-plugin/server';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/get_apm_indices';

export async function createApmSourceMapIndex({
  client,
  logger,
}: {
  client: ElasticsearchClient;
  logger: Logger;
}) {
  return createOrUpdateIndex({
    index: APM_SOURCE_MAP_INDEX,
    client,
    logger,
    mappings,
  });
}

const mappings: Mappings = {
  dynamic: 'strict',
  properties: {
    created: {
      type: 'date',
    },
    content: {
      type: 'binary',
    },
    content_sha256: {
      type: 'keyword',
      index: false,
    },
    'file.path': {
      type: 'keyword',
      index: false,
    },
    'service.name': {
      type: 'keyword',
      index: false,
    },
    'service.version': {
      type: 'keyword',
      index: false,
    },
  },
};
