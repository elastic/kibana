/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValuesType } from 'utility-types';

export const ASSET_TYPES = {
  Dashboard: 'dashboard' as const,
  Rule: 'rule' as const,
  Slo: 'slo' as const,
};

export type AssetType = ValuesType<typeof ASSET_TYPES>;

export interface AssetLink {
  type: AssetType;
  assetId: string;
}

export interface Asset extends AssetLink {
  label: string;
  tags: string[];
}
