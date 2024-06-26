/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Plugin as PluginClass } from '@kbn/core/public';
import {
  DisableManagedEntityResponse,
  EnableManagedEntityResponse,
  ManagedEntityEnabledResponse,
} from '../common/types_api';

export interface EntityManagerPublicPluginSetup {
  entityClient: IEntityClient;
}

export interface EntityManagerPublicPluginStart {
  entityClient: IEntityClient;
}

export type EntityManagerPluginClass = PluginClass<
  EntityManagerPublicPluginSetup | undefined,
  EntityManagerPublicPluginStart | undefined
>;

export interface IEntityClient {
  isManagedEntityDiscoveryEnabled: () => Promise<ManagedEntityEnabledResponse>;
  enableManagedEntityDiscovery: () => Promise<EnableManagedEntityResponse>;
  disableManagedEntityDiscovery: () => Promise<DisableManagedEntityResponse>;
}
