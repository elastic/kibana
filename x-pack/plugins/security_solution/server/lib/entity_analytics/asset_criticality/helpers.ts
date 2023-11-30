/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityRecord } from '../../../../common/api/asset_criticality';

/**
 * CriticalityModifiers are used to adjust the risk score based on the criticality of the asset.
 * TODO fix modifier values
 */
export const CriticalityModifiers = {
  very_important: 1,
  important: 1,
  normal: 1,
  not_important: 1,
};

export const getCriticalityModifier = (
  criticalityLevel?: AssetCriticalityRecord['criticality_level']
): number | undefined => {
  if (criticalityLevel == null) {
    return;
  }

  return CriticalityModifiers[criticalityLevel];
};
