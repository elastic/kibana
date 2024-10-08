/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export const API_SCRAPER_BASE_COMPONENT = 'api_scraper_base';

export const apiScraperBaseComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: API_SCRAPER_BASE_COMPONENT,
  _meta: {
    description: 'Component template for the ECS fields used in the API Scraper data set',
    documentation: 'https://www.elastic.co/guide/en/ecs/current/ecs-base.html',
    ecs_version: '8.0.0',
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
      },
    },
  },
};
