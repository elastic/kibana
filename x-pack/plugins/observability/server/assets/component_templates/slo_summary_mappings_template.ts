/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getSLOSummaryMappingsTemplate = (name: string) => ({
  name,
  template: {
    mappings: {
      properties: {
        slo: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 256,
            },
            revision: {
              type: 'long',
            },
          },
        },
        period: {
          properties: {
            last: {
              properties: {
                value: {
                  type: 'float',
                },
                good_events: {
                  type: 'long',
                },
                total_events: {
                  type: 'long',
                },
                objective: {
                  type: 'float',
                },
                error_budget_initial: {
                  type: 'float',
                },
                error_budget_consumed: {
                  type: 'float',
                },
                error_budget_remaining: {
                  type: 'float',
                },
              },
            },
          },
        },
      },
    },
  },
  _meta: {
    description: 'Mappings for SLO summary',
    version: 1,
    managed: true,
    managed_by: 'observability',
  },
});
