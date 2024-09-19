/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '../../../../../../../src/core/server';

export const ruleStatusSavedObjectType = 'siem-detection-engine-rule-status';

export const ruleStatusSavedObjectMappings: SavedObjectsType['mappings'] = {
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
};

export const type: SavedObjectsType = {
  name: ruleStatusSavedObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: ruleStatusSavedObjectMappings,
};

export const ruleAssetSavedObjectType = 'security-rule';

export const ruleAssetSavedObjectMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    name: {
      type: 'keyword',
    },
    rule_id: {
      type: 'keyword',
    },
    version: {
      type: 'long',
    },
  },
};

export const ruleAssetType: SavedObjectsType = {
  name: ruleAssetSavedObjectType,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: ruleAssetSavedObjectMappings,
};
