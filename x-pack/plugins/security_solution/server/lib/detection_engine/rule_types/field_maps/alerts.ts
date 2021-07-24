/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMap } from '../../../../../../rule_registry/common/field_map';

export const alertsFieldMap: FieldMap = {
  'kibana.alert.ancestors': {
    type: 'object',
    array: true,
    required: true,
  },
  'kibana.alert.ancestors.depth': {
    type: 'long',
    array: false,
    required: true,
  },
  'kibana.alert.ancestors.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.ancestors.index': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.ancestors.type': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.depth': {
    type: 'integer', // TODO: should be 'long'?
    array: false,
    required: true,
  },
  'kibana.alert.original_event': {
    type: 'object',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.action': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.category': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.dataset': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.kind': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.module': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.type': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_time': {
    type: 'date',
    array: false,
    required: true,
  },
  'kibana.alert.threat': {
    type: 'object',
    array: false,
    required: false,
  },
  'kibana.alert.threat.framework': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threat.tactic': {
    type: 'object',
    array: false,
    required: true,
  },
  'kibana.alert.threat.tactic.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threat.tactic.name': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threat.tactic.reference': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threat.technique': {
    type: 'object',
    array: false,
    required: true,
  },
  'kibana.alert.threat.technique.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threat.technique.name': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threat.technique.reference': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threat.technique.subtechnique': {
    type: 'object',
    array: false,
    required: true,
  },
  'kibana.alert.threat.technique.subtechnique.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threat.technique.subtechnique.name': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threat.technique.subtechnique.reference': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threshold_result': {
    type: 'object',
    array: false,
    required: false,
  },
  'kibana.alert.threshold_result.cardinality': {
    type: 'object',
    array: false,
    required: true,
  },
  'kibana.alert.threshold_result.cardinality.field': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threshold_result.cardinality.value': {
    type: 'long',
    array: false,
    required: true,
  },
  'kibana.alert.threshold_result.count': {
    type: 'long',
    array: false,
    required: true,
  },
  'kibana.alert.threshold_result.from': {
    type: 'date',
    array: false,
    required: true,
  },
  'kibana.alert.threshold_result.terms': {
    type: 'object',
    array: false,
    required: true,
  },
  'kibana.alert.threshold_result.terms.field': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.threshold_result.terms.value': {
    type: 'keyword',
    array: false,
    required: true,
  },
};
