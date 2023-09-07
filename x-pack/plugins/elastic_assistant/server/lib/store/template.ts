/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterComponentTemplate } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

const keyword = {
  type: 'keyword' as const,
  ignore_above: 1024,
};

const text = {
  type: 'text' as const,
};

const boolean = {
  type: 'boolean' as const,
};

const date = {
  type: 'date' as const,
};

export const conversationComponentTemplate: ClusterComponentTemplate['component_template']['template'] =
  {
    mappings: {
      properties: {
        apiConfig: {
          properties: {
            connectorId: keyword,
            provider: keyword,
          },
        },
        id: keyword,
        isDefault: boolean,
        messages: {
          properties: {
            content: text,
            role: keyword,
            timestamp: date,
          },
        },
        theme: {
          properties: {
            assistant: {
              properties: {
                icon: keyword,
                name: keyword,
              },
            },
            system: {
              properties: {
                icon: keyword,
              },
            },
            title: keyword,
            titleIcon: keyword,
            user: {
              properties: {
                id: keyword,
                name: keyword,
              },
            },
          },
        },
      },
    },
  };
