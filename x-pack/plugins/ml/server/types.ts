/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { IRouter } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';

import type { AlertingPlugin } from '@kbn/alerting-plugin/server';
import type { ActionsPlugin } from '@kbn/actions-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { RouteGuard } from './lib/route_guard';
import type { ResolveMlCapabilities } from '../common/types/capabilities';
import type { MlLicense } from '../common/license';

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
  taskManager: TaskManagerSetupContract;
}

export interface PluginsStart {
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
  fieldFormats: FieldFormatsStart;
  spaces?: SpacesPluginStart;
  taskManager: TaskManagerStartContract;
}

export interface RouteInitialization {
  router: IRouter;
  mlLicense: MlLicense;
  routeGuard: RouteGuard;
}
