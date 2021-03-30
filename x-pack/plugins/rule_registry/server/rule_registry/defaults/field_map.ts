/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap } from '../../generated/ecs_field_map';
import { pickWithPatterns } from '../field_map/pick_with_patterns';

export const defaultFieldMap = {
  ...pickWithPatterns(
    ecsFieldMap,
    '@timestamp',
    'event.kind',
    'event.action',
    'rule.uuid',
    'rule.id',
    'rule.name',
    'rule.category',
    'tags'
  ),
  producer: { type: 'keyword' },
  'alert.uuid': { type: 'keyword' },
  'alert.id': { type: 'keyword' },
  'alert.start': { type: 'date' },
  'alert.end': { type: 'date' },
  'alert.duration.us': { type: 'long' },
  'alert.severity.level': { type: 'keyword' },
  'alert.severity.value': { type: 'long' },
  'alert.status': { type: 'keyword' },
  'evaluation.value': { type: 'scaled_float', scaling_factor: 100 },
  'evaluation.threshold': { type: 'scaled_float', scaling_factor: 100 },
  'evaluation.status': { type: 'keyword' },
} as const;

export type DefaultFieldMap = typeof defaultFieldMap;
