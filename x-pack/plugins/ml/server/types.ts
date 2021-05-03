/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HomeServerPluginSetup } from 'src/plugins/home/server';
import type { IRouter } from 'kibana/server';
import type { CloudSetup } from '../../cloud/server';
import type { SecurityPluginSetup } from '../../security/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import type { LicensingPluginSetup } from '../../licensing/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '../../spaces/server';
import type { MlLicense } from '../common/license';
import type { ResolveMlCapabilities } from '../common/types/capabilities';
import type { RouteGuard } from './lib/route_guard';
import type { AlertingPlugin } from '../../alerting/server';
import type { ActionsPlugin } from '../../actions/server';
import type { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';

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
  getSpaces?: () => Promise<SpacesPluginStart>;
  resolveMlCapabilities: ResolveMlCapabilities;
}

export interface SavedObjectsRouteDeps {
  getSpaces?: () => Promise<SpacesPluginStart>;
  resolveMlCapabilities: ResolveMlCapabilities;
}

export interface PluginsSetup {
  cloud: CloudSetup;
  features: FeaturesPluginSetup;
  home: HomeServerPluginSetup;
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  alerting?: AlertingPlugin['setup'];
  actions?: ActionsPlugin['setup'];
  usageCollection?: UsageCollectionSetup;
}

export interface PluginsStart {
  spaces?: SpacesPluginStart;
}

export interface RouteInitialization {
  router: IRouter;
  mlLicense: MlLicense;
  routeGuard: RouteGuard;
}
