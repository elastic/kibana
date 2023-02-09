/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesIndexSettings,
  MappingProperty,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { ANALYTICS_COLLECTIONS_INDEX, ANALYTICS_VERSION } from '../..';
import { isResourceAlreadyExistsException } from '../../utils/identify_exceptions';

const analyticsCollectionMappingsProperties: Record<string, MappingProperty> = {
  event_retention_day_length: {
    type: 'long',
  },
  eventsDatastream: {
    type: 'keyword',
  },
  name: {
    type: 'keyword',
  },
};

const defaultSettings: IndicesIndexSettings = {
  auto_expand_replicas: '0-3',
  hidden: true,
  number_of_replicas: 0,
};

interface IndexDefinition {
  aliases: string[];
  mappings: MappingTypeMapping;
  name: string;
  settings: IndicesIndexSettings;
}

export const setupAnalyticsCollectionIndex = async (client: ElasticsearchClient) => {
  const indexConfiguration: IndexDefinition = {
    aliases: [ANALYTICS_COLLECTIONS_INDEX],
    mappings: {
      _meta: {
        version: ANALYTICS_VERSION,
      },
      properties: analyticsCollectionMappingsProperties,
    },
    name: `${ANALYTICS_COLLECTIONS_INDEX}-v${ANALYTICS_VERSION}`,
    settings: defaultSettings,
  };

  try {
    const { mappings, aliases, name: index, settings } = indexConfiguration;
    await client.indices.create({
      index,
      mappings,
      settings,
    });
    await client.indices.updateAliases({
      actions: [
        {
          add: {
            aliases,
            index,
            is_hidden: true,
            is_write_index: true,
          },
        },
      ],
    });
  } catch (error) {
    if (isResourceAlreadyExistsException(error)) {
      // index already exists, swallow error
      return;
    }
    return error;
  }
};
