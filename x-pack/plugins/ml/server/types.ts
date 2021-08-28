/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '../../../../src/core/server/http/router/router';
import type { DataPluginSetup, DataPluginStart } from '../../../../src/plugins/data/server/plugin';
import type {
  FieldFormatsSetup,
  FieldFormatsStart,
} from '../../../../src/plugins/field_formats/server/types';
import type { HomeServerPluginSetup } from '../../../../src/plugins/home/server/plugin';
import type { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server/plugin';
import type { ActionsPlugin } from '../../actions/server/types';
import type { AlertingPlugin } from '../../alerting/server/types';
import type { CloudSetup } from '../../cloud/server/plugin';
import type { PluginSetupContract as FeaturesPluginSetup } from '../../features/server/plugin';
import type { LicensingPluginSetup } from '../../licensing/server/types';
import type { SecurityPluginSetup } from '../../security/server/plugin';
import type { SpacesPluginSetup, SpacesPluginStart } from '../../spaces/server/plugin';
import { MlLicense } from '../common/license/ml_license';
import type { ResolveMlCapabilities } from '../common/types/capabilities';
import { RouteGuard } from './lib/route_guard';

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
  data: DataPluginSetup;
  fieldFormats: FieldFormatsSetup;
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
  data: DataPluginStart;
  fieldFormats: FieldFormatsStart;
  spaces?: SpacesPluginStart;
}

export interface RouteInitialization {
  router: IRouter;
  mlLicense: MlLicense;
  routeGuard: RouteGuard;
}
