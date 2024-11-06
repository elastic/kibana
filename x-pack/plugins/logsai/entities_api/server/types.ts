/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  EntityManagerServerPluginSetup,
  EntityManagerServerPluginStart,
} from '@kbn/entityManager-plugin/server';
import type {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import type {
  PluginSetupContract as AlertingPluginSetup,
  PluginStartContract as AlertingPluginStart,
} from '@kbn/alerting-plugin/server';
import type { SloPluginStart, SloPluginSetup } from '@kbn/slo-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface EntitiesAPISetupDependencies {
  entityManager: EntityManagerServerPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  alerting: AlertingPluginSetup;
  slo: SloPluginSetup;
  spaces: SpacesPluginSetup;
}

export interface EntitiesAPIStartDependencies {
  entityManager: EntityManagerServerPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
  alerting: AlertingPluginStart;
  slo: SloPluginStart;
  spaces: SpacesPluginStart;
}

export interface EntitiesAPIServerSetup {}

export interface EntitiesAPIClient {}

export interface EntitiesAPIServerStart {}
