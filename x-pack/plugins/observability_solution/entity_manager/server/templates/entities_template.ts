/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_BASE_PREFIX, ENTITY_SCHEMA_VERSION_V1 } from '../../common/constants_entities';

export const entitiesIndexTemplateConfig: IndicesPutIndexTemplateRequest = {
  name: `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_index_template`,
  _meta: {
    description:
      "Index template for indices managed by the Elastic Entity Model's entity discovery framework",
    ecs_version: '8.0.0',
  },
  composed_of: [
    `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_base`,
    `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_event`,
    `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_entity`,
  ],
  index_patterns: [`${ENTITY_BASE_PREFIX}.*`],
  priority: 1,
  template: {
    mappings: {
      _meta: {
        version: '1.6.0',
      },
      date_detection: false,
      dynamic_templates: [
        {
          strings_as_keyword: {
            mapping: {
              ignore_above: 1024,
              type: 'keyword',
              fields: {
                text: {
                  type: 'text',
                },
              },
            },
            match_mapping_type: 'string',
          },
        },
        {
          entity_metrics: {
            mapping: {
              type: '{dynamic_type}',
            },
            match_mapping_type: ['long', 'double'],
            path_match: 'entity.metrics.*',
          },
        },
      ],
    },
    settings: {
      index: {
        codec: 'best_compression',
        mapping: {
          total_fields: {
            limit: 2000,
          },
        },
      },
    },
  },
};
