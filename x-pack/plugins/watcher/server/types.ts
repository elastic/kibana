/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';

import { XPackMainPlugin } from '../../../legacy/plugins/xpack_main/server/xpack_main';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
}

export interface ServerShim {
  route: any;
  plugins: {
    xpack_main: XPackMainPlugin;
    watcher: any;
  };
}

export interface RouteDependencies {
  router: IRouter;
  getLicenseStatus: () => LicenseStatus;
}

export interface LicenseStatus {
  hasRequired: boolean;
  message?: string;
}
