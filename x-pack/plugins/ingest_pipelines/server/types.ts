/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { License } from './services';
import { isEsError } from './shared_imports';

export interface Dependencies {
  security: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  config: {
    isSecurityEnabled: () => boolean;
  };
  lib: {
    isEsError: typeof isEsError;
  };
}
