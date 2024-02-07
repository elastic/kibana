/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * For now we have only one asset type.
 * In the future it can be changed to 'host' | 'container' | 'pod' | ...
 */
export type InfraCustomDashboardAssetType = 'host';

export interface InfraCustomDashboard {
  dashboardSavedObjectIdList: string[];
  assetType: InfraCustomDashboardAssetType;
  kuery?: string;
}
