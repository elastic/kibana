/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_BASE_PREFIX } from '../../common/constants_entities';

export const entitiesIndexTemplateConfig: IndicesPutIndexTemplateRequest = {
  name: 'entities_v1_index_template',
  _meta: {
    description: 'The entities index template',
    ecs_version: '8.0.0',
  },
  composed_of: ['entities_v1_base', 'entities_v1_event', 'entities_v1_entity'],
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
              // @ts-expect-error this should work per: https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic-templates.html#match-mapping-type
              type: '{dynamic_type}',
            },
            // @ts-expect-error this should work per: https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic-templates.html#match-mapping-type
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
