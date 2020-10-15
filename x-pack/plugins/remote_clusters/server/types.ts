/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { CloudSetup } from '../../cloud/server';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  cloud: CloudSetup;
  features: FeaturesPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  getLicenseStatus: () => LicenseStatus;
  config: {
    isCloudEnabled: boolean;
  };
}

export interface LicenseStatus {
  valid: boolean;
  message?: string;
}
