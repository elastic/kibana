/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';

export type InfraCustomDashboardAssetType = InventoryItemType;

export interface DashboardIdItem {
  id: string;
  hostNameFilterEnabled: boolean;
}

export interface DashboardItemWithTitle extends DashboardIdItem {
  title: string;
}

export interface InfraCustomDashboard {
  dashboardIdList: DashboardIdItem[];
  assetType: InfraCustomDashboardAssetType;
}
