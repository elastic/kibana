/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, Logger } from 'src/core/server';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
  TRANSACTION_TYPE
} from '../../../../common/elasticsearch_fieldnames';
import { APMConfig } from '../../..';
import {
  createOrUpdateIndex,
  Mappings
} from '../../helpers/create_or_update_index';
import { getApmIndicesConfig } from '../apm_indices/get_apm_indices';
import { CustomLink } from './custom_link_types';

export const createApmCustomLinkIndex = async ({
  esClient,
  config,
  logger
}: {
  esClient: IClusterClient;
  config: APMConfig;
  logger: Logger;
}) => {
  const index = getApmIndicesConfig(config).apmCustomLinkIndex;
  return createOrUpdateIndex({ index, esClient, logger, mappings });
};

export interface CustomLinkES {
  id?: string;
  '@timestamp'?: number;
  label: string;
  url: string;
  [SERVICE_NAME]?: string[];
  [SERVICE_ENVIRONMENT]?: string[];
  [TRANSACTION_NAME]?: string[];
  [TRANSACTION_TYPE]?: string[];
}

export function convertTo(customLink: CustomLink): CustomLinkES {
  const { label, url, filters } = customLink;
  const ESFilters = filters.reduce(
    (acc: Record<string, string[]>, { key, value }) => {
      acc[key] = value;
      return acc;
    },
    {}
  );
  return { label, url, ...ESFilters };
}

const mappings: Mappings = {
  dynamic: 'strict',
  properties: {
    '@timestamp': {
      type: 'date'
    },
    label: {
      type: 'text',
      fields: {
        // Adding keyword type to be able to sort by label alphabetically
        keyword: {
          type: 'keyword'
        }
      }
    },
    url: {
      type: 'keyword'
    },
    service: {
      properties: {
        name: {
          type: 'keyword'
        },
        environment: {
          type: 'keyword'
        }
      }
    },
    transaction: {
      properties: {
        name: {
          type: 'keyword'
        },
        type: {
          type: 'keyword'
        }
      }
    }
  }
};
