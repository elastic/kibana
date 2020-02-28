/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, Logger } from 'src/core/server';
import { APMConfig } from '../../..';
import {
  createOrUpdateIndex,
  Mappings
} from '../../helpers/create_or_update_index';
import { getApmIndicesConfig } from '../apm_indices/get_apm_indices';

export const createApmCustomActionIndex = async ({
  esClient,
  config,
  logger
}: {
  esClient: IClusterClient;
  config: APMConfig;
  logger: Logger;
}) => {
  const index = getApmIndicesConfig(config).apmCustomActionIndex;
  return createOrUpdateIndex({ index, esClient, logger, mappings });
};

const mappings: Mappings = {
  dynamic: false,
  properties: {
    '@timestamp': {
      type: 'date'
    },
    label: {
      type: 'text'
    },
    url: {
      type: 'keyword'
    },
    actionId: {
      type: 'keyword'
    },
    filters: {
      dynamic: true,
      properties: {}
    }
  }
};
