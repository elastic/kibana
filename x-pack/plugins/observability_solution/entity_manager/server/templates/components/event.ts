/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_BASE_PREFIX, ENTITY_SCHEMA_VERSION_V1 } from '../../../common/constants_entities';

export const entitiesEventComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_event`,
  _meta: {
    description:
      "Component template for the event fields used in the Elastic Entity Model's entity discovery framework",
    documentation: 'https://www.elastic.co/guide/en/ecs/current/ecs-event.html',
    ecs_version: '8.0.0',
  },
  template: {
    mappings: {
      properties: {
        event: {
          properties: {
            ingested: {
              type: 'date',
            },
          },
        },
      },
    },
  },
};
