/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, Logger } from 'src/core/server';
import {
  createOrUpdateIndex,
  MappingsDefinition,
} from '../../../../../observability/server';
import { APMConfig } from '../../..';
import { getApmIndicesConfig } from '../apm_indices/get_apm_indices';

export const createApmCustomLinkIndex = async ({
  client,
  config,
  logger,
}: {
  client: ElasticsearchClient;
  config: APMConfig;
  logger: Logger;
}) => {
  const index = getApmIndicesConfig(config).apmCustomLinkIndex;
  return createOrUpdateIndex({
    index,
    client,
    logger,
    mappings,
  });
};

const mappings: MappingsDefinition = {
  dynamic: 'strict',
  properties: {
    '@timestamp': {
      type: 'date',
    },
    label: {
      type: 'text',
      fields: {
        // Adding keyword type to be able to sort by label alphabetically
        keyword: {
          type: 'keyword',
        },
      },
    },
    url: {
      type: 'keyword',
    },
    service: {
      properties: {
        name: {
          type: 'keyword',
        },
        environment: {
          type: 'keyword',
        },
      },
    },
    transaction: {
      properties: {
        name: {
          type: 'keyword',
        },
        type: {
          type: 'keyword',
        },
      },
    },
  },
};
