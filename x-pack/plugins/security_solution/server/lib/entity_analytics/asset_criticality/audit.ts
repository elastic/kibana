/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AssetCriticalityAuditActions {
  ASSET_CRITICALITY_INITIALIZE = 'asset_criticality_initialize',
  ASSET_CRITICALITY_UNASSIGN = 'asset_criticality_unassign',
  ASSET_CRITICALITY_GET = 'asset_criticality_get',
  ASSET_CRITICALITY_PRIVILEGE_GET = 'asset_criticality_privilege_get',
  ASSET_CRITICALITY_STATUS_GET = 'asset_criticality_status_get',
  ASSET_CRITICALITY_UPDATE = 'asset_criticality_update',
  ASSET_CRITICALITY_BULK_UPDATE = 'asset_criticality_bulk_update',
}
