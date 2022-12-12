/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Logger } from '@kbn/core/server';
import {
  createOrUpdateIndex,
  Mappings,
} from '@kbn/observability-plugin/server';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/get_apm_indices';

export async function createApmSourceMapIndex({
  coreStart,
  logger,
}: {
  coreStart: CoreStart;
  logger: Logger;
}) {
  const client = coreStart.elasticsearch.client.asInternalUser;
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
};

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
