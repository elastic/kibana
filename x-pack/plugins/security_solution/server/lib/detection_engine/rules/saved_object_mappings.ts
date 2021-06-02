/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '../../../../../../../src/core/server';

export const ruleStatusSavedObjectType = 'siem-detection-engine-rule-status';

/**
 * Records monitoring information about a rule, such as a when it last failed and why.
 * This object is separate of the Rule SavedObject (why?)
 * See `IRuleStatusSOAttributes` for types that related to this mapping
 */
const ruleStatusSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    /**
     * A reference to a saved object
     */
    alertId: {
      type: 'keyword',
    },
    /**
     * A `JobStatus`
     */
    status: {
      type: 'keyword',
    },
    /**
     * The last date any status was recorded
     * an `IsoDateString`
     */
    statusDate: {
      type: 'date',
    },
    /**
     * The last time the rule failed to run
     * an `IsoDateString`
     */
    lastFailureAt: {
      type: 'date',
    },
    /**
     * The last time the rule ran successfully
     * an `IsoDateString`
     */
    lastSuccessAt: {
      type: 'date',
    },
    /**
     * Provides context about the last failed run.
     * A non-i18n English language message
     */
    lastFailureMessage: {
      type: 'text',
    },
    /**
     * Provides context about the last successful run.
     * A non-i18n English language message
     */
    lastSuccessMessage: {
      type: 'text',
    },
    /**
     * ???
     */
    lastLookBackDate: {
      type: 'date',
    },
    /**
     * When a rule began running late, this explains how much time passed between the expected and actual start times.
     * A non-i18n English language message
     */
    gap: {
      type: 'text',
    },
    /**
     * ???
     * A time duration, in milliseconds.
     */
    bulkCreateTimeDurations: {
      type: 'float',
    },
    /**
     * ???
     * A time duration, in milliseconds.
     */
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
