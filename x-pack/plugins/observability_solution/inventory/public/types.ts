/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ObservabilitySharedPluginStart,
  ObservabilitySharedPluginSetup,
} from '@kbn/observability-shared-plugin/public';
import type { InferencePublicStart, InferencePublicSetup } from '@kbn/inference-plugin/public';
import type {
  DataViewsPublicPluginStart,
  DataViewsPublicPluginSetup,
} from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart, DataPublicPluginSetup } from '@kbn/data-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface InventorySetupDependencies {
  observabilityShared: ObservabilitySharedPluginSetup;
  inference: InferencePublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  data: DataPublicPluginSetup;
}

export interface InventoryStartDependencies {
  observabilityShared: ObservabilitySharedPluginStart;
  inference: InferencePublicStart;
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
}

export interface InventoryPublicSetup {}

export interface InventoryPublicStart {}
