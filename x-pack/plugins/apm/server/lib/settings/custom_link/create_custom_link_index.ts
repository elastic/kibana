/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, Logger } from 'src/core/server';
import { APMConfig } from '../../..';
import {
  createOrUpdateIndex,
  Mappings,
} from '../../helpers/create_or_update_index';
import { getApmIndicesConfig } from '../apm_indices/get_apm_indices';

export const createApmCustomLinkIndex = async ({
  esClient,
  config,
  logger,
}: {
  esClient: IClusterClient;
  config: APMConfig;
  logger: Logger;
}) => {
  const index = getApmIndicesConfig(config).apmCustomLinkIndex;
  return createOrUpdateIndex({ index, esClient, logger, mappings });
};

const mappings: Mappings = {
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
