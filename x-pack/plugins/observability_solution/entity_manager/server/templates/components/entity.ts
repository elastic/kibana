/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export const entitiesEntityComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: 'entities_v1_entity',
  _meta: {
    ecs_version: '8.0.0',
  },
  template: {
    mappings: {
      properties: {
        entity: {
          properties: {
            id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            type: {
              ignore_above: 1024,
              type: 'keyword',
            },
            displayName: {
              type: 'text',
              fields: {
                keyword: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            definitionId: {
              ignore_above: 1024,
              type: 'keyword',
            },
            lastSeenTimestamp: {
              type: 'date',
            },
            firstSeenTimestamp: {
              type: 'date',
            },
          },
        },
      },
    },
  },
};
