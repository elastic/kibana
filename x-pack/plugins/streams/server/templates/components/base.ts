/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export const STREAMS_BASE_COMPONENT = 'streams@mappings';

export const BaseComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: STREAMS_BASE_COMPONENT,
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
        root: {
          type: 'boolean',
        },
        forked_from: {
          ignore_above: 1024,
          type: 'keyword',
        },
        condition: {
          type: 'object',
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
