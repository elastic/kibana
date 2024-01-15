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
