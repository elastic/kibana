/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { KibanaRequest } from '@kbn/core/server';
import {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import {
  SpacesPluginSetup,
  SpacesPluginStart,
} from '@kbn/spaces-plugin/server';
import {
  HomeServerPluginSetup,
  HomeServerPluginStart,
} from '@kbn/home-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { ActionsPlugin } from '@kbn/actions-plugin/server';
import { AlertingPlugin } from '@kbn/alerting-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '@kbn/features-plugin/server';
import {
  LicensingPluginSetup,
  LicensingPluginStart,
} from '@kbn/licensing-plugin/server';
import { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/server';
import { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import {
  SecurityPluginSetup,
  SecurityPluginStart,
} from '@kbn/security-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  FleetSetupContract as FleetPluginSetup,
  FleetStartContract as FleetPluginStart,
} from '@kbn/fleet-plugin/server';
import { APMConfig } from '.';
import { ApmIndicesConfig } from './routes/settings/apm_indices/get_apm_indices';
import { APMEventClient } from './lib/helpers/create_es_client/create_apm_event_client';
import { ApmPluginRequestHandlerContext } from './routes/typings';

export interface APMPluginSetup {
  config$: Observable<APMConfig>;
  getApmIndices: () => Promise<ApmIndicesConfig>;
  createApmEventClient: (params: {
    debug?: boolean;
    request: KibanaRequest;
    context: ApmPluginRequestHandlerContext;
  }) => Promise<APMEventClient>;
}

export interface APMPluginSetupDependencies {
  // required dependencies
  data: DataPluginSetup;
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  observability: ObservabilityPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;

  // optional dependencies
  actions?: ActionsPlugin['setup'];
  alerting?: AlertingPlugin['setup'];
  cloud?: CloudSetup;
  fleet?: FleetPluginSetup;
  home?: HomeServerPluginSetup;
  ml?: MlPluginSetup;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  taskManager?: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
}

export interface APMPluginStartDependencies {
  // required dependencies
  data: DataPluginStart;
  features: FeaturesPluginStart;
  licensing: LicensingPluginStart;
  observability: undefined;
  ruleRegistry: RuleRegistryPluginStartContract;

  // optional dependencies
  actions?: ActionsPlugin['start'];
  alerting?: AlertingPlugin['start'];
  cloud?: undefined;
  fleet?: FleetPluginStart;
  home?: HomeServerPluginStart;
  ml?: MlPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  taskManager?: TaskManagerStartContract;
  usageCollection?: undefined;
}
