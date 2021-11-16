/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'kibana/server';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleStatusSavedObjectMigration } from './legacy_migrations';

/**
 * This side-car rule status SO is deprecated and is to be replaced by the RuleExecutionLog on Event-Log and
 * additional fields on the Alerting Framework Rule SO.
 *
 * @deprecated Remove this once we've fully migrated to event-log and no longer require addition status SO (8.x)
 */
export const legacyRuleStatusSavedObjectType = 'siem-detection-engine-rule-status';

/**
 * This side-car rule status SO is deprecated and is to be replaced by the RuleExecutionLog on Event-Log and
 * additional fields on the Alerting Framework Rule SO.
 *
 * @deprecated Remove this once we've fully migrated to event-log and no longer require addition status SO (8.x)
 */
export const ruleStatusSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
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

/**
 * This side-car rule status SO is deprecated and is to be replaced by the RuleExecutionLog on Event-Log and
 * additional fields on the Alerting Framework Rule SO.
 *
 * @deprecated Remove this once we've fully migrated to event-log and no longer require addition status SO (8.x)
 */
export const legacyRuleStatusType: SavedObjectsType = {
  convertToMultiNamespaceTypeVersion: '8.0.0',
  name: legacyRuleStatusSavedObjectType,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: ruleStatusSavedObjectMappings,
  migrations: legacyRuleStatusSavedObjectMigration,
};
