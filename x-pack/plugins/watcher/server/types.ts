/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server';
import { License } from './services';

export interface SetupDependencies {
  licensing: LicensingPluginSetup;
}

export interface StartDependencies {
  licensing: LicensingPluginStart;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
}
