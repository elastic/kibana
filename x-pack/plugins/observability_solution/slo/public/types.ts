/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AiopsPluginStart } from '@kbn/aiops-plugin/public/types';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { DefaultClientOptions, RouteRepositoryClient } from '@kbn/server-route-repository-client';
import { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import type { SLORouteRepository } from '../server/routes/get_slo_server_route_repository';
import { SLOPlugin } from './plugin';

export type SLORepositoryClient = RouteRepositoryClient<SLORouteRepository, DefaultClientOptions>;

export interface SLOPublicPluginsSetup {
  data: DataPublicPluginSetup;
  embeddable: EmbeddableSetup;
  licensing: LicensingPluginSetup;
  observability: ObservabilityPublicSetup;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  presentationUtil: PresentationUtilPluginStart;
  serverless?: ServerlessPluginSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  uiActions: UiActionsSetup;
  usageCollection: UsageCollectionSetup;
}

export interface SLOPublicPluginsStart {
  aiops: AiopsPluginStart;
  cases: CasesPublicStart;
  charts: ChartsPluginStart;
  cloud?: CloudStart;
  dashboard: DashboardStart;
  data: DataPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  dataViewFieldEditor: DataViewFieldEditorStart;
  dataViews: DataViewsPublicPluginStart;
  discover?: DiscoverStart;
  discoverShared: DiscoverSharedPublicStart;
  embeddable: EmbeddableStart;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  observability: ObservabilityPublicStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  serverless?: ServerlessPluginStart;
  share: SharePluginStart;
  spaces?: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  usageCollection: UsageCollectionStart;
}

export type SLOPublicSetup = ReturnType<SLOPlugin['setup']>;
export type SLOPublicStart = ReturnType<SLOPlugin['start']>;
