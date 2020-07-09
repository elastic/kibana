/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LegacyScopedClusterClient, IRouter } from 'kibana/server';

import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { isEsError } from './shared_imports';

export interface Dependencies {
  licensing: LicensingPluginSetup;
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
