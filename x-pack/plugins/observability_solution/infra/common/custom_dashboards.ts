/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';

export type InfraCustomDashboardAssetType = InventoryItemType;

export interface InfraCustomDashboard {
  dashboardSavedObjectId: string;
  assetType: InfraCustomDashboardAssetType;
  dashboardFilterAssetIdEnabled: boolean;
}

export interface InfraSavedCustomDashboard extends InfraCustomDashboard {
  id: string;
}

export interface DashboardItemWithTitle extends InfraSavedCustomDashboard {
  title: string;
}
