/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ScopedClusterClient, IRouter } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { CloudSetup } from '../../cloud/server';
import { License } from './services';
import { wrapEsError } from './lib';
import { isEsError } from './shared_imports';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  cloud?: CloudSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  config: {
    isSlmEnabled: boolean;
    isSecurityEnabled: () => boolean;
    isCloudEnabled: boolean;
  };
  lib: {
    isEsError: typeof isEsError;
    wrapEsError: typeof wrapEsError;
  };
}

export type CallAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];
