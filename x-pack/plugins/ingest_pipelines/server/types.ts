/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { License } from './services';
import { handleEsError } from './shared_imports';

export interface Dependencies {
  security: SecurityPluginSetup;
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  config: {
    isSecurityEnabled: () => boolean;
  };
  lib: {
    handleEsError: typeof handleEsError;
  };
}
