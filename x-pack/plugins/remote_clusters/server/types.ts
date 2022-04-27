/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';

import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';

import { handleEsError } from './shared_imports';

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
  lib: {
    handleEsError: typeof handleEsError;
  };
}

export interface LicenseStatus {
  valid: boolean;
  message?: string;
}
