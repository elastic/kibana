/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';

import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { IndexDataEnricher } from './services';
import { handleEsError } from './shared_imports';

export interface Dependencies {
  security: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  config: {
    isSecurityEnabled: () => boolean;
  };
  indexDataEnricher: IndexDataEnricher;
  lib: {
    handleEsError: typeof handleEsError;
  };
}
