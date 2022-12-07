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
import { getApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';
import { APMConfig } from '../..';

export const createSourceMapIndex = async ({
  client,
  config,
  logger,
}: {
  client: ElasticsearchClient;
  config: APMConfig;
  logger: Logger;
}) => {
  const { apmSourceMapIndex } = getApmIndicesConfig(config);
  return createOrUpdateIndex({
    index: apmSourceMapIndex,
    client,
    logger,
    mappings,
  });
};

const mappings: Mappings = {
  dynamic: 'strict',
  properties: {
    body: {
      type: 'binary',
    },
    compression_algorithm: {
      type: 'keyword',
      index: false,
    },
    created: {
      type: 'date',
    },
    decoded_sha256: {
      type: 'keyword',
    },
    decoded_size: {
      type: 'long',
      index: false,
    },
    encoded_sha256: {
      type: 'keyword',
    },
    encoded_size: {
      type: 'long',
      index: false,
    },
    encryption_algorithm: {
      type: 'keyword',
      index: false,
    },
    identifier: {
      type: 'keyword',
    },
    package_name: {
      type: 'keyword',
    },
    relative_url: {
      type: 'keyword',
    },
    type: {
      type: 'keyword',
    },
  },
};
