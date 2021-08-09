/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_DURATION,
  EVENT_END,
  EVENT_SEQUENCE,
  MESSAGE,
  RULE_STATUS,
  RULE_STATUS_SEVERITY,
} from './constants';

/**
 * @deprecated ruleExecutionFieldMap is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const ruleExecutionFieldMap = {
  // [ALERT_OWNER]: { type: 'keyword', required: true },
  // [SPACE_IDS]: { type: 'keyword', array: true, required: true },
  // [RULE_ID]: { type: 'keyword', required: true },
  [MESSAGE]: { type: 'keyword' },
  [EVENT_SEQUENCE]: { type: 'long' },
  [EVENT_END]: { type: 'date' },
  [EVENT_DURATION]: { type: 'long' },
  [RULE_STATUS]: { type: 'keyword' },
  [RULE_STATUS_SEVERITY]: { type: 'integer' },
} as const;

/**
 * @deprecated RuleExecutionFieldMap is kept here only as a reference. It will be superseded with EventLog implementation
 */
export type RuleExecutionFieldMap = typeof ruleExecutionFieldMap;
