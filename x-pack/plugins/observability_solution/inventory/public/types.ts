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
import {
  EntityManagerPublicPluginSetup,
  EntityManagerPublicPluginStart,
} from '@kbn/entityManager-plugin/public';
import type { InferencePublicStart, InferencePublicSetup } from '@kbn/inference-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface InventorySetupDependencies {
  observabilityShared: ObservabilitySharedPluginSetup;
  inference: InferencePublicSetup;
  share: SharePluginSetup;
  data: DataPublicPluginSetup;
  entityManager: EntityManagerPublicPluginSetup;
}

export interface InventoryStartDependencies {
  observabilityShared: ObservabilitySharedPluginStart;
  inference: InferencePublicStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  entityManager: EntityManagerPublicPluginStart;
  share: SharePluginStart;
}

export interface InventoryPublicSetup {}

export interface InventoryPublicStart {}
