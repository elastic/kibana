/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterComponentTemplate } from '@elastic/elasticsearch/lib/api/types';

const keyword = {
  type: 'keyword' as const,
  ignore_above: 1024,
};

const text = {
  type: 'text' as const,
};

const date = {
  type: 'date' as const,
};

const dynamic = {
  type: 'object' as const,
  dynamic: true,
};

const integer = {
  type: 'integer' as const,
};

export const conversationComponentTemplate: ClusterComponentTemplate['component_template']['template'] =
  {
    mappings: {
      dynamic_templates: [
        {
          numeric_labels: {
            path_match: 'numeric_labels.*',
            mapping: {
              scaling_factor: 1000000,
              type: 'scaled_float',
            },
          },
        },
      ],
      dynamic: false,
      properties: {
        '@timestamp': date,
        labels: dynamic,
        numeric_labels: dynamic,
        user: {
          properties: {
            id: keyword,
            name: keyword,
          },
        },
        conversation: {
          properties: {
            id: keyword,
            title: text,
            last_updated: date,
            token_count: {
              properties: {
                prompt: integer,
                completion: integer,
                total: integer,
              },
            },
          },
        },
        namespace: keyword,
        messages: {
          type: 'object',
          properties: {
            '@timestamp': date,
            message: {
              type: 'object',
              properties: {
                content: text,
                event: text,
                role: keyword,
                data: {
                  type: 'object',
                  enabled: false,
                },
                function_call: {
                  type: 'object',
                  properties: {
                    name: keyword,
                    arguments: {
                      type: 'object',
                      enabled: false,
                    },
                    trigger: keyword,
                  },
                },
              },
            },
          },
        },
        public: {
          type: 'boolean',
        },
      },
    },
  };
