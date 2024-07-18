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
/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface InventorySetupDependencies {
  entityManager: EntityManagerServerPluginSetup;
}

export interface InventoryStartDependencies {
  entityManager: EntityManagerServerPluginStart;
}

export interface InventoryServerSetup {}

export interface InventoryClient {}

export interface InventoryServerStart {}
