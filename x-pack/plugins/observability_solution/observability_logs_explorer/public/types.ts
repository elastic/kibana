/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { LogsExplorerPluginStart } from '@kbn/logs-explorer-plugin/public';
import { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type {
  AppMountParameters,
  ScopedHistory,
  AnalyticsServiceStart,
  I18nStart,
  ThemeServiceStart,
} from '@kbn/core/public';
import { LogsSharedClientStartExports } from '@kbn/logs-shared-plugin/public';
import { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { SloPublicStart } from '@kbn/slo-plugin/public';
import { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import {
  ObservabilityLogsExplorerLocators,
  ObservabilityLogsExplorerLocationState,
} from '../common/locators';

export interface ObservabilityLogsExplorerPluginSetup {
  locators: ObservabilityLogsExplorerLocators;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityLogsExplorerPluginStart {}

export interface ObservabilityLogsExplorerSetupDeps {
  discover: DiscoverSetup;
  serverless?: ServerlessPluginStart;
  share: SharePluginSetup;
}

export interface ObservabilityLogsExplorerStartDeps {
  data: DataPublicPluginStart;
  discover: DiscoverStart;
  logsExplorer: LogsExplorerPluginStart;
  logsShared: LogsSharedClientStartExports;
  logsDataAccess: LogsDataAccessPluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  slo: SloPublicStart;
  serverless?: ServerlessPluginStart;
  triggersActionsUi?: TriggersAndActionsUIPublicPluginStart;
  unifiedSearch?: UnifiedSearchPublicPluginStart;
  dataViews?: DataViewsPublicPluginStart;
  dataViewEditor?: DataViewEditorStart;
  lens?: LensPublicStart;
  share: SharePluginStart;
}

export type ObservabilityLogsExplorerHistory =
  ScopedHistory<ObservabilityLogsExplorerLocationState>;
export type ObservabilityLogsExplorerAppMountParameters =
  AppMountParameters<ObservabilityLogsExplorerLocationState>;

export interface ObservabilityLogsExplorerStartServices {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
}
