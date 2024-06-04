/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export const entitiesBaseComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: 'entities_v1_base',
  _meta: {
    documentation: 'https://www.elastic.co/guide/en/ecs/current/ecs-base.html',
    ecs_version: '8.0.0',
  },
  template: {
    mappings: {
      properties: {
        '@timestamp': {
          type: 'date',
        },
        labels: {
          type: 'object',
        },
        tags: {
          ignore_above: 1024,
          type: 'keyword',
        },
      },
    },
  },
};
