/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';

import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { IndexManagementPluginSetup } from '../../index_management/server';
import { License } from './services';
import { IndexLifecycleManagementConfig } from './config';
import { handleEsError } from './shared_imports';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  indexManagement?: IndexManagementPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  config: IndexLifecycleManagementConfig;
  license: License;
  lib: {
    handleEsError: typeof handleEsError;
  };
}
