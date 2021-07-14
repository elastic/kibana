/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const alertsFieldMap = {
  'kibana.alert.consumer': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.space_ids': {
    type: 'keyword',
    array: true,
    required: true,
  },
  'kibana.alert._meta_version': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.depth': {
    type: 'long',
    array: false,
    required: true,
  },
  'kibana.alert.original_time': {
    type: 'date',
    array: false,
    required: true,
  },
  'kibana.alert.duration': {
    type: 'long',
    array: false,
    required: true,
  },
  'kibana.alert.workflow_status': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.workflow_user': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.workflow_reason': {
    type: 'text',
    array: false,
    required: true,
  },
  'kibana.alert.system_status': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.severity': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'kibana.alert.risk_score': {
    type: 'long',
    array: false,
    required: true,
  },
  'kibana.alert.ancestors.depth': {
    type: 'long',
    array: false,
    required: true,
  },
  'kibana.alert.ancestors': {
    type: 'object',
    array: true,
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
  // TODO: rule fields
};
