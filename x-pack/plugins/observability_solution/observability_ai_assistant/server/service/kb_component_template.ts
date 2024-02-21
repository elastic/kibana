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

const date = {
  type: 'date' as const,
};

const dynamic = {
  type: 'object' as const,
  dynamic: true,
};

export const kbComponentTemplate: ClusterComponentTemplate['component_template']['template'] = {
  mappings: {
    dynamic: false,
    properties: {
      '@timestamp': date,
      id: keyword,
      doc_id: { type: 'text', fielddata: true },
      user: {
        properties: {
          id: keyword,
          name: keyword,
        },
      },
      labels: dynamic,
      conversation: {
        properties: {
          id: keyword,
          title: text,
          last_updated: date,
        },
      },
      namespace: keyword,
      text,
      'ml.tokens': {
        type: 'rank_features',
      },
      confidence: keyword,
      is_correction: {
        type: 'boolean',
      },
      public: {
        type: 'boolean',
      },
    },
  },
};
