/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { KibanaRequest } from 'kibana/server';
import {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '../../rule_registry/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../src/plugins/data/server';
import { SpacesPluginSetup, SpacesPluginStart } from '../../spaces/server';
import {
  HomeServerPluginSetup,
  HomeServerPluginStart,
} from '../../../../src/plugins/home/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { ActionsPlugin } from '../../actions/server';
import { AlertingPlugin } from '../../alerting/server';
import { CloudSetup } from '../../cloud/server';
import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../features/server';
import {
  LicensingPluginSetup,
  LicensingPluginStart,
} from '../../licensing/server';
import { MlPluginSetup, MlPluginStart } from '../../ml/server';
import { ObservabilityPluginSetup } from '../../observability/server';
import {
  SecurityPluginSetup,
  SecurityPluginStart,
} from '../../security/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../task_manager/server';
import {
  FleetSetupContract as FleetPluginSetup,
  FleetStartContract as FleetPluginStart,
} from '../../fleet/server';
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
