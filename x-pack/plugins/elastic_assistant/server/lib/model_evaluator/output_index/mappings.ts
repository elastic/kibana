/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const evaluationIndexMappings: MappingTypeMapping = {
  properties: {
    '@timestamp': {
      type: 'date',
    },
    evaluation: {
      properties: {
        reasoning: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        score: {
          type: 'long',
        },
        value: {
          type: 'text',
        },
      },
    },
    evaluationId: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    evaluationStart: {
      type: 'long',
    },
    evaluationEnd: {
      type: 'long',
    },
    evaluationDuration: {
      type: 'long',
    },
    input: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    prediction: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    predictionResponse: {
      properties: {
        status: {
          type: 'text',
        },
        value: {
          properties: {
            connector_id: {
              type: 'text',
            },
            data: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            status: {
              type: 'text',
            },
          },
        },
      },
    },
    reference: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    totalAgents: {
      type: 'long',
    },
    totalInput: {
      type: 'long',
    },
    totalRequests: {
      type: 'long',
    },
  },
};
