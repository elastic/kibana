/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const alertMappings: SavedObjectsTypeMappingDefinition = {
  properties: {
    enabled: {
      type: 'boolean',
    },
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          normalizer: 'lowercase',
        },
      },
    },
    tags: {
      type: 'keyword',
    },
    alertTypeId: {
      type: 'keyword',
    },
    schedule: {
      properties: {
        interval: {
          type: 'keyword',
        },
      },
    },
    consumer: {
      type: 'keyword',
    },
    legacyId: {
      type: 'keyword',
    },
    actions: {
      type: 'nested',
      properties: {
        group: {
          type: 'keyword',
        },
        actionRef: {
          type: 'keyword',
        },
        actionTypeId: {
          type: 'keyword',
        },
        params: {
          enabled: false,
          type: 'object',
        },
      },
    },
    params: {
      type: 'flattened',
      ignore_above: 4096,
    },
    mapped_params: {
      properties: {
        risk_score: {
          type: 'float',
        },
        severity: {
          type: 'keyword',
        },
      },
    },
    scheduledTaskId: {
      type: 'keyword',
    },
    createdBy: {
      type: 'keyword',
    },
    updatedBy: {
      type: 'keyword',
    },
    createdAt: {
      type: 'date',
    },
    updatedAt: {
      type: 'date',
    },
    apiKey: {
      type: 'binary',
    },
    apiKeyOwner: {
      type: 'keyword',
    },
    throttle: {
      type: 'keyword',
    },
    notifyWhen: {
      type: 'keyword',
    },
    muteAll: {
      type: 'boolean',
    },
    mutedInstanceIds: {
      type: 'keyword',
    },
    meta: {
      properties: {
        versionApiKeyLastmodified: {
          type: 'keyword',
        },
      },
    },
    monitoring: {
      properties: {
        execution: {
          properties: {
            history: {
              properties: {
                duration: {
                  type: 'long',
                },
                success: {
                  type: 'boolean',
                },
                timestamp: {
                  type: 'date',
                },
              },
            },
            calculated_metrics: {
              properties: {
                p50: {
                  type: 'long',
                },
                p95: {
                  type: 'long',
                },
                p99: {
                  type: 'long',
                },
                success_ratio: {
                  type: 'float',
                },
              },
            },
          },
        },
      },
    },
    executionStatus: {
      properties: {
        numberOfTriggeredActions: {
          type: 'long',
        },
        status: {
          type: 'keyword',
        },
        lastExecutionDate: {
          type: 'date',
        },
        lastDuration: {
          type: 'long',
        },
        error: {
          properties: {
            reason: {
              type: 'keyword',
            },
            message: {
              type: 'keyword',
            },
          },
        },
        warning: {
          properties: {
            reason: {
              type: 'keyword',
            },
            message: {
              type: 'keyword',
            },
          },
        },
      },
    },
    snoozeSchedule: {
      type: 'nested',
      properties: {
        id: {
          type: 'keyword',
        },
        duration: {
          type: 'long',
        },
        skipRecurrences: {
          type: 'date',
          format: 'strict_date_time',
        },
        rRule: {
          type: 'nested',
          properties: {
            freq: {
              type: 'keyword',
            },
            dtstart: {
              type: 'date',
              format: 'strict_date_time',
            },
            tzid: {
              type: 'keyword',
            },
            until: {
              type: 'date',
              format: 'strict_date_time',
            },
            count: {
              type: 'long',
            },
            interval: {
              type: 'long',
            },
            wkst: {
              type: 'keyword',
            },
            byweekday: {
              type: 'keyword',
            },
            bymonth: {
              type: 'short',
            },
            bysetpos: {
              type: 'long',
            },
            bymonthday: {
              type: 'short',
            },
            byyearday: {
              type: 'short',
            },
            byweekno: {
              type: 'short',
            },
            byhour: {
              type: 'long',
            },
            byminute: {
              type: 'long',
            },
            bysecond: {
              type: 'long',
            },
          },
        },
      },
    },
  },
};
