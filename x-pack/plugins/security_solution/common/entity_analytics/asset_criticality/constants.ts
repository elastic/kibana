/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriticalityLevel } from './types';

export const ASSET_CRITICALITY_INDEX_PATTERN = '.asset-criticality.asset-criticality-*';

type AssetCriticalityIndexPrivilege = 'read' | 'write';
export const ASSET_CRITICALITY_REQUIRED_ES_INDEX_PRIVILEGES = {
  [ASSET_CRITICALITY_INDEX_PATTERN]: ['read', 'write'] as AssetCriticalityIndexPrivilege[],
};

/**
 * enum of asset criticality levels corresponding to the union type {@link CriticalityLevel}
 */
export enum CriticalityLevels {
  VERY_IMPORTANT = 'very_important',
  IMPORTANT = 'important',
  NORMAL = 'normal',
  NOT_IMPORTANT = 'not_important',
}

/**
 * CriticalityModifiers are used to adjust the risk score based on the criticality of the asset.
 */
export const CriticalityModifiers: Record<CriticalityLevel, number> = {
  [CriticalityLevels.VERY_IMPORTANT]: 2,
  [CriticalityLevels.IMPORTANT]: 1.5,
  [CriticalityLevels.NORMAL]: 1,
  [CriticalityLevels.NOT_IMPORTANT]: 0.5,
};
