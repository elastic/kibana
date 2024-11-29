/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ENTITY_LATEST,
  ENTITY_SCHEMA_VERSION_V1,
  EntityDefinition,
  entitiesIndexPattern,
  entitiesAliasPattern,
} from '@kbn/entities-schema';
import { generateLatestIndexTemplateId } from '../helpers/generate_component_id';
import {
  ENTITY_ENTITY_COMPONENT_TEMPLATE_V1,
  ENTITY_EVENT_COMPONENT_TEMPLATE_V1,
  ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V1,
} from '../../../../common/constants_entities';
import { isBuiltinDefinition } from '../helpers/is_builtin_definition';

export const generateEntitiesLatestIndexTemplateConfig = (
  definition: EntityDefinition
): IndicesPutIndexTemplateRequest => ({
  name: generateLatestIndexTemplateId(definition),
  _meta: {
    description:
      "Index template for indices managed by the Elastic Entity Model's entity discovery framework for the latest dataset",
    ecs_version: '8.0.0',
    managed: true,
    managed_by: 'elastic_entity_model',
  },
  ignore_missing_component_templates: getCustomLatestTemplateComponents(definition),
  composed_of: [
    ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V1,
    ENTITY_ENTITY_COMPONENT_TEMPLATE_V1,
    ENTITY_EVENT_COMPONENT_TEMPLATE_V1,
    ...getCustomLatestTemplateComponents(definition),
  ],
  index_patterns: [
    entitiesIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V1,
      dataset: ENTITY_LATEST,
      definitionId: definition.id,
    }),
  ],
  priority: 200,
  template: {
    aliases: {
      [entitiesAliasPattern({ type: definition.type, dataset: ENTITY_LATEST })]: {},
    },
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
});

function getCustomLatestTemplateComponents(definition: EntityDefinition) {
  if (isBuiltinDefinition(definition)) {
    return [];
  }

  return [
    `${definition.id}@platform`, // @platform goes before so it can be overwritten by custom
    `${definition.id}-latest@platform`,
    `${definition.id}@custom`,
    `${definition.id}-latest@custom`,
  ];
}
