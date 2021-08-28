/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import type { ValuesType } from 'utility-types';
import type { APMConfig } from '.';
import type { CoreSetup, CoreStart } from '../../../../src/core/server';
import { KibanaRequest } from '../../../../src/core/server/http/router/request';
import type { APMOSSPluginSetup } from '../../../../src/plugins/apm_oss/server/types';
import type {
  DataPluginSetup,
  DataPluginStart,
} from '../../../../src/plugins/data/server/plugin';
import type {
  HomeServerPluginSetup,
  HomeServerPluginStart,
} from '../../../../src/plugins/home/server/plugin';
import type { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server/plugin';
import type { ActionsPlugin } from '../../actions/server/types';
import type { AlertingPlugin } from '../../alerting/server/types';
import type { CloudSetup } from '../../cloud/server/plugin';
import type {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../features/server/plugin';
import type {
  FleetSetupContract as FleetPluginSetup,
  FleetStartContract as FleetPluginStart,
} from '../../fleet/server/plugin';
import type {
  LicensingPluginSetup,
  LicensingPluginStart,
} from '../../licensing/server/types';
import type { MlPluginSetup, MlPluginStart } from '../../ml/server/plugin';
import type { ObservabilityPluginSetup } from '../../observability/server/plugin';
import type {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '../../rule_registry/server/plugin';
import type {
  SecurityPluginSetup,
  SecurityPluginStart,
} from '../../security/server/plugin';
import type {
  SpacesPluginSetup,
  SpacesPluginStart,
} from '../../spaces/server/plugin';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../task_manager/server/plugin';
import { createApmEventClient } from './lib/helpers/create_es_client/create_apm_event_client';
import { getApmIndices } from './lib/settings/apm_indices/get_apm_indices';
import type { ApmPluginRequestHandlerContext } from './routes/typings';

export interface APMPluginSetup {
  config$: Observable<APMConfig>;
  getApmIndices: () => ReturnType<typeof getApmIndices>;
  createApmEventClient: (params: {
    debug?: boolean;
    request: KibanaRequest;
    context: ApmPluginRequestHandlerContext;
  }) => Promise<ReturnType<typeof createApmEventClient>>;
}

interface DependencyMap {
  core: {
    setup: CoreSetup;
    start: CoreStart;
  };
  spaces: {
    setup: SpacesPluginSetup;
    start: SpacesPluginStart;
  };
  apmOss: {
    setup: APMOSSPluginSetup;
    start: undefined;
  };
  home: {
    setup: HomeServerPluginSetup;
    start: HomeServerPluginStart;
  };
  licensing: {
    setup: LicensingPluginSetup;
    start: LicensingPluginStart;
  };
  cloud: {
    setup: CloudSetup;
    start: undefined;
  };
  usageCollection: {
    setup: UsageCollectionSetup;
    start: undefined;
  };
  taskManager: {
    setup: TaskManagerSetupContract;
    start: TaskManagerStartContract;
  };
  alerting: {
    setup: AlertingPlugin['setup'];
    start: AlertingPlugin['start'];
  };
  actions: {
    setup: ActionsPlugin['setup'];
    start: ActionsPlugin['start'];
  };
  observability: {
    setup: ObservabilityPluginSetup;
    start: undefined;
  };
  features: {
    setup: FeaturesPluginSetup;
    start: FeaturesPluginStart;
  };
  security: {
    setup: SecurityPluginSetup;
    start: SecurityPluginStart;
  };
  ml: {
    setup: MlPluginSetup;
    start: MlPluginStart;
  };
  data: {
    setup: DataPluginSetup;
    start: DataPluginStart;
  };
  ruleRegistry: {
    setup: RuleRegistryPluginSetupContract;
    start: RuleRegistryPluginStartContract;
  };
  fleet: {
    setup: FleetPluginSetup;
    start: FleetPluginStart;
  };
}

const requiredDependencies = [
  'features',
  'apmOss',
  'data',
  'licensing',
  'triggersActionsUi',
  'embeddable',
  'infra',
  'observability',
  'ruleRegistry',
] as const;

const optionalDependencies = [
  'spaces',
  'cloud',
  'usageCollection',
  'taskManager',
  'actions',
  'alerting',
  'security',
  'ml',
  'home',
  'maps',
  'fleet',
] as const;

type RequiredDependencies = Pick<
  DependencyMap,
  ValuesType<typeof requiredDependencies> & keyof DependencyMap
>;

type OptionalDependencies = Partial<
  Pick<
    DependencyMap,
    ValuesType<typeof optionalDependencies> & keyof DependencyMap
  >
>;

export type APMPluginDependencies = RequiredDependencies & OptionalDependencies;

export type APMPluginSetupDependencies = {
  [key in keyof APMPluginDependencies]: Required<APMPluginDependencies>[key]['setup'];
};

export type APMPluginStartDependencies = {
  [key in keyof APMPluginDependencies]: Required<APMPluginDependencies>[key]['start'];
};
