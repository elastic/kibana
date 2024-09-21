/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValuesType } from 'utility-types';

export const ASSET_TYPES = {
  RULE: 'rule',
  DASHBOARD: 'dashboard',
  SLO_DEFINITION: 'sloDefinition',
} as const;

export type AssetType = ValuesType<typeof ASSET_TYPES>;

interface AssetBase {
  type: AssetType;
}

export interface DashboardAsset extends AssetBase {
  type: 'dashboard';
  id: string;
  displayName: string;
}

export interface RuleAsset extends AssetBase {
  type: 'rule';
  id: string;
  displayName: string;
}

export interface SloAsset extends AssetBase {
  type: 'sloDefinition';
  id: string;
  displayName: string;
}

export type Asset = DashboardAsset | RuleAsset | SloAsset;

export interface AssetSuggestion {
  asset: Asset;
}
