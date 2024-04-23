/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, CoreStart } from '@kbn/core/server';
import type { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AlertingPlugin } from '@kbn/alerting-plugin/server';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { License } from './services';

export interface PluginSetupDependencies {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  alerting?: AlertingPlugin['setup'];
  fieldFormats: FieldFormatsSetup;
  security?: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface PluginStartDependencies {
  dataViews: DataViewsServerPluginStart;
  fieldFormats: FieldFormatsStart;
  security?: SecurityPluginStart;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  coreStart: CoreStart;
  dataViews: DataViewsServerPluginStart;
  security?: SecurityPluginStart;
}
