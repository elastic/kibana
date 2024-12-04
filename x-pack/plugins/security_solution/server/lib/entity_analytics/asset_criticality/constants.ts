/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap } from '@kbn/alerts-as-data-utils';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';

export type CriticalityValues = AssetCriticalityRecord['criticality_level'] | 'deleted';

const assetCriticalityMapping = {
  type: 'keyword',
  array: false,
  required: false,
};

export const assetCriticalityFieldMap: FieldMap = {
  '@timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  id_field: {
    type: 'keyword',
    array: false,
    required: false,
  },
  id_value: {
    type: 'keyword',
    array: false,
    required: false,
  },
  criticality_level: assetCriticalityMapping,
  updated_at: {
    type: 'date',
    array: false,
    required: false,
  },
  'asset.criticality': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'host.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'host.asset.criticality': assetCriticalityMapping,
  'user.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'user.asset.criticality': assetCriticalityMapping,
} as const;

export const CRITICALITY_VALUES: { readonly [K in CriticalityValues as Uppercase<K>]: K } = {
  LOW_IMPACT: 'low_impact',
  MEDIUM_IMPACT: 'medium_impact',
  HIGH_IMPACT: 'high_impact',
  EXTREME_IMPACT: 'extreme_impact',
  DELETED: 'deleted',
};
