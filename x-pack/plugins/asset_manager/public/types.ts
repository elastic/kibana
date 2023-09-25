/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart, Plugin as PluginClass } from '@kbn/core/public';

interface PublicAssetClient {}

export interface AssetManagerSetupExports {
  assetClient: PublicAssetClient;
}
export type AssetManagerStartExports = void;
export interface AssetManagerSetupDeps {}
export interface AssetManagerStartDeps {}

export type AssetManagerPluginClass = PluginClass<
  AssetManagerSetupExports,
  AssetManagerStartExports,
  AssetManagerSetupDeps,
  AssetManagerStartDeps
>;
