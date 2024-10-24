/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type {
  DatasetQualityPluginSetup,
  DatasetQualityPluginStart,
} from '@kbn/dataset-quality-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type {
  InvestigatePublicSetup,
  InvestigatePublicStart,
} from '@kbn/investigate-plugin/public';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {
  enabled: boolean;
}

export interface InvestigateAppSetupDependencies {
  investigate: InvestigatePublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPublicSetup;
  lens: LensPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  data: DataPublicPluginSetup;
  embeddable: EmbeddableSetup;
  contentManagement: {};
  datasetQuality: DatasetQualityPluginSetup;
  unifiedSearch: {};
  uiActions: UiActionsSetup;
  security: SecurityPluginSetup;
}

export interface InvestigateAppStartDependencies {
  investigate: InvestigatePublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  contentManagement: ContentManagementPublicStart;
  datasetQuality: DatasetQualityPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  uiActions: UiActionsStart;
  security: SecurityPluginStart;
  charts: ChartsPluginStart;
}

export interface InvestigateAppPublicSetup {}

export interface InvestigateAppPublicStart {}
