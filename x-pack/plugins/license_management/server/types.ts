/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyScopedClusterClient, IRouter } from 'kibana/server';

import { PluginSetupContract as FeaturesPluginSetup } from 'x-pack/plugins/features/server';
import { LicensingPluginSetup } from 'x-pack/plugins/licensing/server';
import { SecurityPluginSetup } from 'x-pack/plugins/security/server';
import { isEsError } from './shared_imports';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  security?: SecurityPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  plugins: {
    licensing: LicensingPluginSetup;
  };
  lib: {
    isEsError: typeof isEsError;
  };
  config: {
    isSecurityEnabled: boolean;
  };
}

export type CallAsCurrentUser = LegacyScopedClusterClient['callAsCurrentUser'];

export type CallAsInternalUser = LegacyScopedClusterClient['callAsInternalUser'];
