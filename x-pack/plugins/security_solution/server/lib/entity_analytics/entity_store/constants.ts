/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap } from '@kbn/alerts-as-data-utils';

export const FIELD_HISTORY_MAX_SIZE = 10;

export const COMPOSITES_INDEX_PATTERN = '.entities.entity-composites.*';
export const MAX_COMPOSITE_SIZE = 500;
export const MAX_CRITICALITY_SIZE = 500;

export const entityStoreFieldMap: FieldMap = {
  '@timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  // user or host
  entity_type: {
    type: 'keyword',
    array: false,
    required: true,
  },
  first_seen: {
    type: 'date',
    array: false,
    required: true,
  },
  last_seen: {
    type: 'date',
    array: false,
    required: true,
  },
  // HOST
  'host.architecture': {
    type: 'keyword',
    required: false,
    array: true,
  },
  'host.id': {
    type: 'keyword',
    required: false,
    array: true,
  },
  'host.ip': {
    type: 'ip',
    required: false,
    array: true,
  },
  'host.ip_history.timestamp': {
    type: 'date',
    required: false,
    array: true,
  },
  'host.ip_history.value': {
    type: 'ip',
    required: false,
    array: true,
  },
  'host.name': {
    type: 'keyword',
    required: true,
    array: false,
  },
  'host.os.platform': {
    type: 'keyword',
    required: false,
    array: true,
  },
  'host.os.version': {
    type: 'keyword',
    required: false,
    array: true,
  },
  // AGENT
  'agent.type': {
    type: 'keyword',
    required: false,
    array: true,
  },
  'agent.id': {
    type: 'keyword',
    required: false,
    array: true,
  },
  // CLOUD
  'cloud.provider': {
    type: 'keyword',
    required: false,
    array: true,
  },
  'cloud.region': {
    type: 'keyword',
    required: false,
    array: true,
  },
  // RISK SCORE
  'host.risk.calculated_level': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'host.risk.calculated_score': {
    type: 'float',
    array: false,
    required: false,
  },
  'host.risk.calculated_score_norm': {
    type: 'float',
    array: false,
    required: false,
  },
  // ASSET CRITICALITY
  'host.asset.criticality': {
    type: 'keyword',
    array: false,
    required: false,
  },
} as const;
