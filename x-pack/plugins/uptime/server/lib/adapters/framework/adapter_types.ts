/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  IRouter,
  LegacyCallAPIOptions,
  SavedObjectsClientContract,
  ISavedObjectsRepository,
} from 'src/core/server';
import { UMKibanaRoute } from '../../../rest_api';
import { PluginSetupContract } from '../../../../../features/server';
import { DynamicSettings } from '../../../../common/runtime_types';

export type APICaller = (
  endpoint: string,
  clientParams: Record<string, any>,
  options?: LegacyCallAPIOptions
) => Promise<any>;

export type UMElasticsearchQueryFn<P, R = any> = (
  params: { callES: APICaller; dynamicSettings: DynamicSettings } & P
) => Promise<R>;

export type UMSavedObjectsQueryFn<T = any, P = undefined> = (
  client: SavedObjectsClientContract | ISavedObjectsRepository,
  params?: P
) => Promise<T> | T;

export interface UptimeCoreSetup {
  router: IRouter;
}

export interface UptimeCorePlugins {
  features: PluginSetupContract;
  alerts: any;
  elasticsearch: any;
  usageCollection: UsageCollectionSetup;
}

export interface UMBackendFrameworkAdapter {
  registerRoute(route: UMKibanaRoute): void;
}
