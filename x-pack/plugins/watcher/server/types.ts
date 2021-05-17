/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from 'src/core/server';

import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server';
import { License, handleEsError } from './shared_imports';

export interface SetupDependencies {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
}

export interface StartDependencies {
  licensing: LicensingPluginStart;
}

export interface ServerShim {
  route: any;
  plugins: {
    watcher: any;
  };
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  lib: {
    handleEsError: typeof handleEsError;
  };
}
