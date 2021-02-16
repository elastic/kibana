/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '../../../../../../../src/core/server';

export const ruleActionsSavedObjectType = 'siem-detection-engine-rule-actions';

export const ruleActionsSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    alertThrottle: {
      type: 'keyword',
    },
    ruleAlertId: {
      type: 'keyword',
    },
    ruleThrottle: {
      type: 'keyword',
    },
    actions: {
      properties: {
        group: {
          type: 'keyword',
        },
        id: {
          type: 'keyword',
        },
        action_type_id: {
          type: 'keyword',
        },
        params: {
          type: 'object',
          enabled: false,
        },
      },
    },
  },
};

export const type: SavedObjectsType = {
  name: ruleActionsSavedObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: ruleActionsSavedObjectMappings,
};
