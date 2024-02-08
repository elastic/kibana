/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FieldMap } from '@kbn/alerts-as-data-utils';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';

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
  criticality_level: {
    type: 'keyword',
    array: false,
    required: false,
  },
  updated_at: {
    type: 'date',
    array: false,
    required: false,
  },
} as const;

/**
 * CriticalityModifiers are used to adjust the risk score based on the criticality of the asset.
 */
export const CriticalityModifiers: Record<AssetCriticalityRecord['criticality_level'], number> = {
  very_important: 2,
  important: 1.5,
  normal: 1,
  not_important: 0.5,
};
