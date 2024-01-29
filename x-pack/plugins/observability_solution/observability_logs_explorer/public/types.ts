/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { LogExplorerPluginStart } from '@kbn/logs-explorer-plugin/public';
import { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { AppMountParameters, ScopedHistory } from '@kbn/core/public';
import { LogsSharedClientStartExports } from '@kbn/logs-shared-plugin/public';
import { DatasetQualityPluginStart } from '@kbn/dataset-quality-plugin/public';
import { ObservabilityAIAssistantPluginStart } from '@kbn/observability-ai-assistant-plugin/public';
import {
  ObservabilityLogExplorerLocators,
  ObservabilityLogExplorerLocationState,
} from '../common/locators';

export interface ObservabilityLogExplorerPluginSetup {
  locators: ObservabilityLogExplorerLocators;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityLogExplorerPluginStart {}

export interface ObservabilityLogExplorerSetupDeps {
  discover: DiscoverSetup;
  serverless?: ServerlessPluginStart;
  share: SharePluginSetup;
}

export interface ObservabilityLogExplorerStartDeps {
  data: DataPublicPluginStart;
  discover: DiscoverStart;
  logsExplorer: LogExplorerPluginStart;
  logsShared: LogsSharedClientStartExports;
  observabilityAIAssistant: ObservabilityAIAssistantPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  serverless?: ServerlessPluginStart;
  share: SharePluginStart;
  datasetQuality: DatasetQualityPluginStart;
}

export type ObservabilityLogExplorerHistory = ScopedHistory<ObservabilityLogExplorerLocationState>;
export type ObservabilityLogExplorerAppMountParameters =
  AppMountParameters<ObservabilityLogExplorerLocationState>;
