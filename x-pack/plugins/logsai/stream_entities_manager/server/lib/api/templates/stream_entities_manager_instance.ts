/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { generateInstanceIndexTemplateId } from '../helpers/generate_component_id';
import { ApiScraperDefinition } from '../../../../common/types';
import { SEM_BASE_COMPONENT } from '../../../templates/components/base';

const getCustomTemplateComponents = (definition: ApiScraperDefinition) => {
  return [
    `${definition.id}@platform`, // @platform goes before so it can be overwritten by custom
    `${definition.id}-latest@platform`,
    `${definition.id}@custom`,
    `${definition.id}-latest@custom`,
  ];
};

export const generateInstanceIndexTemplateConfig = (
  definition: ApiScraperDefinition
): IndicesPutIndexTemplateRequest => ({
  name: generateInstanceIndexTemplateId(definition),
  _meta: {
    description:
      'Index template for indices managed by the Stream Entities Manager framework for the instance dataset',
    ecs_version: '8.0.0',
    managed: true,
    managed_by: 'stream_entities_manager',
  },
  ignore_missing_component_templates: getCustomTemplateComponents(definition),
  composed_of: [SEM_BASE_COMPONENT, ...getCustomTemplateComponents(definition)],
  index_patterns: [`.${definition.id}`],
  priority: 200,
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
          metrics: {
            mapping: {
              type: '{dynamic_type}',
            },
            match_mapping_type: ['long', 'double'],
            path_match: 'metrics.*',
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
});
