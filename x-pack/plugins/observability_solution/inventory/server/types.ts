/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  EntityManagerServerPluginStart,
  EntityManagerServerPluginSetup,
} from '@kbn/entityManager-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type {
  DataViewsServerPluginSetup,
  DataViewsServerPluginStart,
} from '@kbn/data-views-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  RuleRegistryPluginStartContract,
  RuleRegistryPluginSetupContract,
} from '@kbn/rule-registry-plugin/server';
/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface InventorySetupDependencies {
  entityManager: EntityManagerServerPluginSetup;
  inference: InferenceServerSetup;
  dataViews: DataViewsServerPluginSetup;
  features: FeaturesPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
}

export interface InventoryStartDependencies {
  entityManager: EntityManagerServerPluginStart;
  inference: InferenceServerStart;
  dataViews: DataViewsServerPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
}

export interface InventoryServerSetup {}

export interface InventoryClient {}

export interface InventoryServerStart {}
