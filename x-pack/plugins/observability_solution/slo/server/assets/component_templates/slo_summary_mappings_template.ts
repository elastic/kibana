/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { SLO_RESOURCES_VERSION } from '../../../common/constants';

export const getSLOSummaryMappingsTemplate = (
  name: string
): ClusterPutComponentTemplateRequest => ({
  name,
  template: {
    mappings: {
      properties: {
        // APM service and transaction specific fields
        service: {
          properties: {
            name: {
              type: 'keyword',
            },
            environment: {
              type: 'keyword',
            },
          },
        },
        transaction: {
          properties: {
            name: {
              type: 'keyword',
            },
            type: {
              type: 'keyword',
            },
          },
        },
        // SLO field mappings
        slo: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 256,
            },
            revision: {
              type: 'long',
            },
            groupBy: {
              type: 'keyword',
            },
            groupings: {
              type: 'flattened',
            },
            instanceId: {
              type: 'keyword',
              fields: {
                text: {
                  type: 'text',
                },
              },
            },
            name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                },
              },
            },
            description: {
              type: 'text',
            },
            tags: {
              type: 'keyword',
            },
            indicator: {
              dynamic: false,
              properties: {
                type: {
                  type: 'keyword',
                },
              },
            },
            objective: {
              properties: {
                target: {
                  type: 'double',
                },
                timesliceTarget: {
                  type: 'double',
                },
                timesliceWindow: {
                  type: 'keyword',
                },
              },
            },
            budgetingMethod: {
              type: 'keyword',
            },
            timeWindow: {
              properties: {
                duration: {
                  type: 'keyword',
                },
                type: {
                  type: 'keyword',
                },
              },
            },
          },
        },
        sliValue: {
          type: 'double',
        },
        goodEvents: {
          type: 'long',
        },
        totalEvents: {
          type: 'long',
        },
        errorBudgetInitial: {
          type: 'double',
        },
        errorBudgetConsumed: {
          type: 'double',
        },
        errorBudgetRemaining: {
          type: 'double',
        },
        errorBudgetEstimated: {
          type: 'boolean',
        },
        statusCode: {
          type: 'byte',
        },
        status: {
          type: 'keyword',
        },
        isTempDoc: {
          type: 'boolean',
        },
        latestSliTimestamp: {
          type: 'date',
          format: 'date_optional_time||epoch_millis',
        },
        summaryUpdatedAt: {
          type: 'date',
          format: 'date_optional_time||epoch_millis',
        },
        spaceId: {
          type: 'keyword',
        },
      },
    },
  },
  _meta: {
    description: 'SLO summary mappings template',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
});
