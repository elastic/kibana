/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const defaultFieldMap = {
  'event.kind': { type: 'keyword', required: true },
  '@timestamp': { type: 'date', required: true },
  'alert.id': { type: 'keyword', required: true },
  'alert.created': { type: 'date', required: true },
  'alert.active': { type: 'boolean', required: true },
  // 'alert.muted': { type: 'boolean', required: true },
  'alert.type': { type: 'keyword', required: true },
  'alert.name': { type: 'keyword', required: true },
  'alert.series_id': { type: 'keyword', required: true }, // rule.id + alert.name
  'alert.check.severity': { type: 'keyword', required: true },
  'alert.check.value': { type: 'scaled_float', scaling_factor: 100 },
  'alert.check.threshold': { type: 'scaled_float', scaling_factor: 100 },
  'alert.check.influencers': { type: 'flattened' },
  'rule.id': { type: 'keyword', required: true },
  'rule.namespace': { type: 'keyword' },
  'rule.name': { type: 'keyword', required: true },
  'rule.interval.ms': { type: 'long', required: true },
  'rule_type.id': { type: 'keyword', required: true },
  'rule_type.name': { type: 'keyword', required: true },
  'rule_type.producer': { type: 'keyword', required: true },
} as const;

export type DefaultFieldMap = typeof defaultFieldMap;
