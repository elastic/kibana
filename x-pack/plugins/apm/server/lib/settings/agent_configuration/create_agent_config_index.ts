/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyClusterClient, Logger } from 'src/core/server';
import {
  createOrUpdateIndex,
  MappingsDefinition,
} from '../../../../../observability/server';
import { APMConfig } from '../../..';
import { getApmIndicesConfig } from '../apm_indices/get_apm_indices';

export async function createApmAgentConfigurationIndex({
  esClient,
  config,
  logger,
}: {
  esClient: ILegacyClusterClient;
  config: APMConfig;
  logger: Logger;
}) {
  const index = getApmIndicesConfig(config).apmAgentConfigurationIndex;
  return createOrUpdateIndex({
    index,
    apiCaller: esClient.callAsInternalUser,
    logger,
    mappings,
  });
}

const mappings: MappingsDefinition = {
  dynamic: 'strict',
  dynamic_templates: [
    {
      // force string to keyword (instead of default of text + keyword)
      strings: {
        match_mapping_type: 'string',
        mapping: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
  ],
  properties: {
    '@timestamp': {
      type: 'date',
    },
    service: {
      properties: {
        name: {
          type: 'keyword',
          ignore_above: 1024,
        },
        environment: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    settings: {
      // allowing dynamic fields without specifying anything specific
      dynamic: true,
      properties: {},
    },
    applied_by_agent: {
      type: 'boolean',
    },
    agent_name: {
      type: 'keyword',
      ignore_above: 1024,
    },
    etag: {
      type: 'keyword',
      ignore_above: 1024,
    },
  },
};
