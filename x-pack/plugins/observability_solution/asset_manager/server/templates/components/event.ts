/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export const entitiesEventComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: 'entities_v1_event',
  _meta: {
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
