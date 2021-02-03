/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { ILegacyScopedClusterClient, IRouter, RequestHandlerContext } from 'src/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
}

export interface ServerShim {
  route: any;
  plugins: {
    watcher: any;
  };
}

export interface RouteDependencies {
  router: WatcherRouter;
  getLicenseStatus: () => LicenseStatus;
}

export interface LicenseStatus {
  hasRequired: boolean;
  message?: string;
}

/**
 * @internal
 */
export interface WatcherContext {
  client: ILegacyScopedClusterClient;
}

/**
 * @internal
 */
export interface WatcherRequestHandlerContext extends RequestHandlerContext {
  watcher: WatcherContext;
}

/**
 * @internal
 */
export type WatcherRouter = IRouter<WatcherRequestHandlerContext>;
