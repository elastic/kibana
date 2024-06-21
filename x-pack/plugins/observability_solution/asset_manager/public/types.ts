/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Plugin as PluginClass } from '@kbn/core/public';
import { GetHostsOptionsPublic } from '../common/types_client';
import {
  DisableManagedEntityResponse,
  EnableManagedEntityResponse,
  GetHostAssetsResponse,
  ManagedEntityEnabledResponse,
} from '../common/types_api';

export interface AssetManagerPublicPluginSetup {
  publicAssetsClient: IPublicAssetsClient;
  entityClient: IEntityClient;
}

export interface AssetManagerPublicPluginStart {
  publicAssetsClient: IPublicAssetsClient;
  entityClient: IEntityClient;
}

export type AssetManagerPluginClass = PluginClass<
  AssetManagerPublicPluginSetup | undefined,
  AssetManagerPublicPluginStart | undefined
>;

export interface IPublicAssetsClient {
  getHosts: (options: GetHostsOptionsPublic) => Promise<GetHostAssetsResponse>;
}

export interface IEntityClient {
  isManagedEntityDiscoveryEnabled: () => Promise<ManagedEntityEnabledResponse>;
  enableManagedEntityDiscovery: () => Promise<EnableManagedEntityResponse>;
  disableManagedEntityDiscovery: () => Promise<DisableManagedEntityResponse>;
}
