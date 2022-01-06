/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const rulesFieldMap = {
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
} as const;

export type RulesFieldMap = typeof rulesFieldMap;
