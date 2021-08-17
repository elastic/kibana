/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const rulesFieldMap = {
  'kibana.alert.rule.building_block_type': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.rule.false_positives': {
    type: 'keyword',
    array: true,
    required: true,
  },
  'kibana.alert.rule.immutable': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.index': {
    type: 'keyword',
    array: true,
    required: true,
  },
  'kibana.alert.rule.language': {
    type: 'keyword',
    array: true,
    required: true,
  },
  'kibana.alert.rule.max_signals': {
    type: 'long',
    array: true,
    required: true,
  },
  'kibana.alert.rule.query': {
    type: 'keyword',
    array: true,
    required: true,
  },
  'kibana.alert.rule.saved_id': {
    type: 'keyword',
    array: true,
    required: true,
  },
  'kibana.alert.rule.threat_filters': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threat_index': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threat_indicator_path': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threat_language': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threat_mapping': {
    type: 'object',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threat_mapping.field': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threat_mapping.value': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threat_mapping.type': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threat_query': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threshold': {
    type: 'object',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threshold.field': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threshold.value': {
    type: 'float', // TODO: should be 'long' (eventually, after we stabilize)
    array: true,
    required: false,
  },
  'kibana.alert.rule.threshold.cardinality': {
    type: 'object',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threshold.cardinality.field': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.threshold.cardinality.value': {
    type: 'long',
    array: true,
    required: false,
  },
  'kibana.alert.rule.timeline_id': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'kibana.alert.rule.timeline_title': {
    type: 'keyword',
    array: true,
    required: false,
  },
} as const;

export type RulesFieldMap = typeof rulesFieldMap;
