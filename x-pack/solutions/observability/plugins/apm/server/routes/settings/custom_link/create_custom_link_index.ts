/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { Mappings } from '@kbn/observability-plugin/server';
import { createOrUpdateIndex } from '@kbn/observability-plugin/server';
import { APM_CUSTOM_LINK_INDEX } from '@kbn/apm-sources-access-plugin/server';

export const createApmCustomLinkIndex = async ({
  client,
  logger,
}: {
  client: ElasticsearchClient;
  logger: Logger;
}) => {
  return createOrUpdateIndex({
    index: APM_CUSTOM_LINK_INDEX,
    client,
    logger,
    mappings,
  });
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
      // FIXME: PropertyBase type is missing .fields
    } as estypes.MappingPropertyBase,
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
