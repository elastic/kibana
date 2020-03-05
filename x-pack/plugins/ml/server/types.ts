/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { HomeServerPluginSetup } from 'src/plugins/home/server';
import { IRouter } from 'src/core/server';
import { CloudSetup } from '../../cloud/server';
import { SecurityPluginSetup } from '../../security/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SpacesPluginSetup } from '../../spaces/server';
import { MlServerLicense } from './lib/license';

export interface LicenseCheckResult {
  isAvailable: boolean;
  isActive: boolean;
  isEnabled: boolean;
  isSecurityDisabled: boolean;
  status?: string;
  type?: string;
}

export interface SystemRouteDeps {
  cloud: CloudSetup;
  spacesPlugin: SpacesPluginSetup;
}

export interface PluginsSetup {
  cloud: CloudSetup;
  features: FeaturesPluginSetup;
  home: HomeServerPluginSetup;
  licensing: LicensingPluginSetup;
  security: SecurityPluginSetup;
  spaces: SpacesPluginSetup;
  usageCollection: UsageCollectionSetup;
}

export interface RouteInitialization {
  router: IRouter;
  mlLicense: MlServerLicense;
}
