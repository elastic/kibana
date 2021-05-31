/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LegacyScopedClusterClient,
  ILegacyScopedClusterClient,
  IRouter,
  RequestHandlerContext,
} from 'src/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { IndexDataEnricher } from './services';
import { isEsError, parseEsError, handleEsError } from './shared_imports';

export interface Dependencies {
  security: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
}

export interface RouteDependencies {
  router: IndexManagementRouter;
  config: {
    isSecurityEnabled: () => boolean;
  };
  indexDataEnricher: IndexDataEnricher;
  lib: {
    isEsError: typeof isEsError;
    parseEsError: typeof parseEsError;
    handleEsError: typeof handleEsError;
  };
}

export type CallAsCurrentUser = LegacyScopedClusterClient['callAsCurrentUser'];

export interface DataManagementContext {
  client: ILegacyScopedClusterClient;
}

/**
 * @internal
 */
export interface IndexManagementApiRequestHandlerContext {
  client: ILegacyScopedClusterClient;
}

/**
 * @internal
 */
export interface IndexManagementRequestHandlerContext extends RequestHandlerContext {
  dataManagement: IndexManagementApiRequestHandlerContext;
}

/**
 * @internal
 */
export type IndexManagementRouter = IRouter<IndexManagementRequestHandlerContext>;
