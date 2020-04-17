/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ruleStatusSavedObjectType = 'siem-detection-engine-rule-status';

export const ruleStatusSavedObjectMappings = {
  [ruleStatusSavedObjectType]: {
    properties: {
      alertId: {
        type: 'keyword',
      },
      status: {
        type: 'keyword',
      },
      statusDate: {
        type: 'date',
      },
      lastFailureAt: {
        type: 'date',
      },
      lastSuccessAt: {
        type: 'date',
      },
      lastFailureMessage: {
        type: 'text',
      },
      lastSuccessMessage: {
        type: 'text',
      },
      lastLookBackDate: {
        type: 'date',
      },
      gap: {
        type: 'text',
      },
      bulkCreateTimeDurations: {
        type: 'float',
      },
      searchAfterTimeDurations: {
        type: 'float',
      },
    },
  },
};
