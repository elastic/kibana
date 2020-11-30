/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LegacyScopedClusterClient, IRouter } from 'src/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { License, IndexDataEnricher } from './services';
import { isEsError, handleEsError } from './shared_imports';

export interface Dependencies {
  security: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  config: {
    isSecurityEnabled: () => boolean;
  };
  indexDataEnricher: IndexDataEnricher;
  lib: {
    isEsError: typeof isEsError;
    handleEsError: typeof handleEsError;
  };
}

export type CallAsCurrentUser = LegacyScopedClusterClient['callAsCurrentUser'];
