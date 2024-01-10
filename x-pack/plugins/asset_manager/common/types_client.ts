/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssetFilters, SingleKindAssetFilters } from './types_api';

export interface SharedAssetsOptionsPublic<F = AssetFilters> {
  from: string;
  to?: string;
  filters?: F;
  stringFilters?: string;
}

// Methods that return only a single "kind" of asset should not accept
// a filter of "kind" to filter by asset kinds

export type GetHostsOptionsPublic = SharedAssetsOptionsPublic<SingleKindAssetFilters>;
export type GetContainersOptionsPublic = SharedAssetsOptionsPublic<SingleKindAssetFilters>;
export type GetPodsOptionsPublic = SharedAssetsOptionsPublic<SingleKindAssetFilters>;
export type GetServicesOptionsPublic = SharedAssetsOptionsPublic<SingleKindAssetFilters>;
export type GetAssetsOptionsPublic = SharedAssetsOptionsPublic<AssetFilters>;
