/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Plugin as PluginClass } from '@kbn/core/public';
import { GetHostsOptionsPublic } from '../common/types_client';
import { GetHostAssetsResponse } from '../common/types_api';
export interface AssetManagerSetupExports {
  publicAssetsClient: IPublicAssetsClient;
}

export type AssetManagerStartExports = void;

export type AssetManagerPluginClass = PluginClass<
  AssetManagerSetupExports,
  AssetManagerStartExports
>;

export interface IPublicAssetsClient {
  getHosts: (options: GetHostsOptionsPublic) => Promise<GetHostAssetsResponse>;
}
