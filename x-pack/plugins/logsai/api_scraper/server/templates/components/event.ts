/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export const API_SCRAPER_EVENT_COMPONENT = 'api_scraper_event';

export const apiScraperEventComponentTemplateConfig: ClusterPutComponentTemplateRequest = {
  name: API_SCRAPER_EVENT_COMPONENT,
  _meta: {
    description: 'Component template for the event fields used in the API Scraper framework',
    documentation: 'https://www.elastic.co/guide/en/ecs/current/ecs-event.html',
    ecs_version: '8.0.0',
    managed: true,
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
