/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, CoreSetup } from '@kbn/core/server';
import { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AlertingPlugin } from '@kbn/alerting-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { License } from './services';

export interface PluginSetupDependencies {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  alerting?: AlertingPlugin['setup'];
  security: SecurityPluginSetup;
}

export interface PluginStartDependencies {
  dataViews: DataViewsServerPluginStart;
  security: SecurityPluginStart;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  getStartServices: CoreSetup<PluginStartDependencies>['getStartServices'];
}
