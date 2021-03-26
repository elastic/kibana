/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Mutable } from 'utility-types';
import { ecsFieldMap } from '../../generated/ecs_field_map';
import { pickWithPatterns } from '../field_map/pick_with_patterns';

export const defaultFieldMap = {
  ...pickWithPatterns(ecsFieldMap, '@timestamp', 'event.*', 'rule.*'),
  'alert.id': { type: 'keyword' },
  'alert.type': { type: 'keyword' },
  'alert.name': { type: 'keyword' },
  'alert.series_id': { type: 'keyword' }, // rule.id + alert.name
  'alert.check.value': { type: 'scaled_float', scaling_factor: 100 },
  'alert.check.threshold': { type: 'scaled_float', scaling_factor: 100 },
  'alert.check.influencers': { type: 'flattened' },
  'rule_type.producer': { type: 'keyword', required: true },
} as const;

type DefaultFieldMapReadOnly = typeof defaultFieldMap;

export type DefaultFieldMap = Mutable<
  {
    [key in keyof DefaultFieldMapReadOnly]: Mutable<DefaultFieldMapReadOnly[key]>;
  }
>;
