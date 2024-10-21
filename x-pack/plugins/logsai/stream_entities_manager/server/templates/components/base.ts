/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export const SEM_BASE_COMPONENT = 'stream-entities@mappings';

export const BaseComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: SEM_BASE_COMPONENT,
  _meta: {
    description: 'Component template for the Stream Entities Manager data set',
    managed: true,
  },
  template: {
    mappings: {
      properties: {
        labels: {
          type: 'object',
        },
        tags: {
          ignore_above: 1024,
          type: 'keyword',
        },
        id: {
          ignore_above: 1024,
          type: 'keyword',
        },
        dataset: {
          ignore_above: 1024,
          type: 'keyword',
        },
        type: {
          ignore_above: 1024,
          type: 'keyword',
        },
        forked_from: {
          ignore_above: 1024,
          type: 'keyword',
        },
        condition: {
          ignore_above: 1024,
          type: 'keyword',
        },
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
