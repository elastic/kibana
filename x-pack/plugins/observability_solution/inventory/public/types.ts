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
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type {
  EntityManagerPublicPluginStart,
  EntityManagerPublicPluginSetup,
} from '@kbn/entityManager-plugin/public';
import type {
  UnifiedSearchPluginSetup,
  UnifiedSearchPublicPluginStart,
} from '@kbn/unified-search-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface InventorySetupDependencies {
  observabilityShared: ObservabilitySharedPluginSetup;
  inference: InferencePublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  data: DataPublicPluginSetup;
  fieldFormats: FieldFormatsSetup;
  entityManager: EntityManagerPublicPluginSetup;
  unifiedSearch: UnifiedSearchPluginSetup;
}

export interface InventoryStartDependencies {
  observabilityShared: ObservabilitySharedPluginStart;
  inference: InferencePublicStart;
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  entityManager: EntityManagerPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface InventoryPublicSetup {}

export interface InventoryPublicStart {}
