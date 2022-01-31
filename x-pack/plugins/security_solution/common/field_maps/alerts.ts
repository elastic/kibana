/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMap } from '../../../rule_registry/common/field_map';

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
  'kibana.alert.ancestors.rule': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.ancestors.type': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.building_block_type': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.depth': {
    type: 'long',
    array: false,
    required: true,
  },
  'kibana.alert.group.id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.group.index': {
    type: 'integer',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.action': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.agent_id_status': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.category': {
    type: 'keyword',
    array: true,
    required: true,
  },
  'kibana.alert.original_event.code': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.created': {
    type: 'date',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.dataset': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.duration': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.end': {
    type: 'date',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.hash': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.ingested': {
    type: 'date',
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
  'kibana.alert.original_event.original': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.outcome': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.provider': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.reason': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.reference': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.risk_score': {
    type: 'float',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.risk_score_norm': {
    type: 'float',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.sequence': {
    type: 'long',
    array: false,
    required: true,
  },
  'kibana.alert.original_event.severity': {
    type: 'long',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.start': {
    type: 'date',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.timezone': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.original_event.type': {
    type: 'keyword',
    array: true,
    required: true,
  },
  'kibana.alert.original_event.url': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.original_time': {
    type: 'date',
    array: false,
    required: true,
  },
  'kibana.alert.reason': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.threshold_result.cardinality': {
    type: 'object',
    array: false,
    required: false,
  },
  'kibana.alert.threshold_result.cardinality.field': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.threshold_result.cardinality.value': {
    type: 'long',
    array: false,
    required: false,
  },
  'kibana.alert.threshold_result.count': {
    type: 'long',
    array: false,
    required: false,
  },
  'kibana.alert.threshold_result.from': {
    type: 'date',
    array: false,
    required: false,
  },
  'kibana.alert.threshold_result.terms': {
    type: 'object',
    array: true,
    required: false,
  },
  'kibana.alert.threshold_result.terms.field': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'kibana.alert.threshold_result.terms.value': {
    type: 'keyword',
    array: false,
    required: false,
  },
} as const;

export type AlertsFieldMap = typeof alertsFieldMap;
