/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export const oamAssetComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: 'oam_v1_asset',
  _meta: {
    ecs_version: '8.0.0',
  },
  template: {
    mappings: {
      properties: {
        asset: {
          properties: {
            category: {
              ignore_above: 1024,
              type: 'keyword',
            },
            id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            indexPattern: {
              ignore_above: 1024,
              type: 'keyword',
            },
            defintionId: {
              ignore_above: 1024,
              type: 'keyword',
            },
            latestTimestamp: {
              type: 'date',
            },
          },
        },
      },
    },
  },
};
