/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getSLOMappingsTemplate = (name: string) => ({
  name,
  template: {
    mappings: {
      properties: {
        '@timestamp': {
          type: 'date',
          format: 'date_optional_time||epoch_millis',
        },
        slo: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 256,
            },
            revision: {
              type: 'long',
            },
            numerator: {
              type: 'long',
            },
            denominator: {
              type: 'long',
            },
            context: {
              type: 'flattened',
            },
            _internal: {
              properties: {
                name: { type: 'keyword', ignore_above: 256 },
                budgeting_method: { type: 'keyword' },
                objective: {
                  properties: {
                    target: { type: 'double' },
                  },
                },
                time_window: {
                  properties: {
                    duration: { type: 'keyword' },
                    is_rolling: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  _meta: {
    description: 'Mappings for SLO rollup data',
    version: 1,
  },
});
