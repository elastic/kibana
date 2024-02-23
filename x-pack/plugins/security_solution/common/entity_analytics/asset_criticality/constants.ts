/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ASSET_CRITICALITY_INDEX_PATTERN = '.asset-criticality.asset-criticality-*';

type AssetCriticalityIndexPrivilege = 'read' | 'write';
export const ASSET_CRITICALITY_REQUIRED_ES_INDEX_PRIVILEGES = {
  [ASSET_CRITICALITY_INDEX_PATTERN]: ['read', 'write'] as AssetCriticalityIndexPrivilege[],
};

/**
 * enum of asset criticality levels corresponding to the union type {@link CriticalityLevel}
 */
export enum CriticalityLevels {
  EXTREME_IMPACT = 'extreme_impact',
  HIGH_IMPACT = 'high_impact',
  MEDIUM_IMPACT = 'medium_impact',
  LOW_IMPACT = 'low_impact',
}

/**
 * CriticalityModifiers are used to adjust the risk score based on the criticality of the asset.
 */
export const CriticalityModifiers: Record<CriticalityLevels, number> = {
  [CriticalityLevels.EXTREME_IMPACT]: 2,
  [CriticalityLevels.HIGH_IMPACT]: 1.5,
  [CriticalityLevels.MEDIUM_IMPACT]: 1,
  [CriticalityLevels.LOW_IMPACT]: 0.5,
};
