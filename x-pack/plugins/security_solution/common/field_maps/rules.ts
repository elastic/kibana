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
  'kibana.alert.rule.exceptions_list': {
    type: 'object',
    array: true,
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
  'kibana.alert.rule.max_signals': {
    type: 'long',
    array: true,
    required: true,
  },
  'kibana.alert.rule.threat.framework': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.rule.threat.tactic.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.rule.threat.tactic.name': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.rule.threat.tactic.reference': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.rule.threat.technique.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.rule.threat.technique.name': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.rule.threat.technique.reference': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.rule.threat.technique.subtechnique.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.rule.threat.technique.subtechnique.name': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.rule.threat.technique.subtechnique.reference': {
    type: 'keyword',
    array: false,
    required: true,
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
  'kibana.alert.rule.timestamp_override': {
    type: 'keyword',
    array: false,
    required: false,
  },
} as const;

export type RulesFieldMap = typeof rulesFieldMap;
