/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';

import type { Plugin as PluginClass } from '@kbn/core/public';
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type {
  EntityManagerPublicPluginSetup,
  EntityManagerPublicPluginStart,
} from '@kbn/entityManager-plugin/public';

export interface EntityManagerUIPluginSetupDependencies {
  entityManager: EntityManagerPublicPluginSetup;
  data: DataPublicPluginSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  serverless?: ServerlessPluginSetup;
  usageCollection: UsageCollectionSetup;
}

export interface EntityManagerUIPluginStartDependencies {
  entityManager: EntityManagerPublicPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  dataViewFieldEditor: DataViewFieldEditorStart;
  lens: LensPublicStart;
  presentationUtil: PresentationUtilPluginStart;
  charts: ChartsPluginStart;
  cloud?: CloudStart;
  serverless?: ServerlessPluginStart;
  usageCollection: UsageCollectionStart;
  observabilityShared: ObservabilitySharedPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityManagerUIPublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityManagerUIPublicStart {}

export type EntityManagerPluginClass = PluginClass<
  EntityManagerUIPublicSetup,
  EntityManagerUIPublicStart,
  EntityManagerUIPluginSetupDependencies,
  EntityManagerUIPluginStartDependencies
>;
