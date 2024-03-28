/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin as PluginClass } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';

import { LogsSharedLocators } from '../common/locators';
import type { LogAIAssistantProps } from './components/log_ai_assistant/log_ai_assistant';
// import type { OsqueryPluginStart } from '../../osquery/public';
import { LogViewsServiceSetup, LogViewsServiceStart } from './services/log_views';

// Our own setup and start contract values
export interface LogsSharedClientSetupExports {
  logViews: LogViewsServiceSetup;
  locators: LogsSharedLocators;
}

export interface LogsSharedClientStartExports {
  logViews: LogViewsServiceStart;
  LogAIAssistant: (props: Omit<LogAIAssistantProps, 'observabilityAIAssistant'>) => JSX.Element;
}

export interface LogsSharedClientSetupDeps {
  share: SharePluginSetup;
}

export interface LogsSharedClientStartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  uiActions: UiActionsStart;
}

export type LogsSharedClientCoreSetup = CoreSetup<
  LogsSharedClientStartDeps,
  LogsSharedClientStartExports
>;
export type LogsSharedClientCoreStart = CoreStart;
export type LogsSharedClientPluginClass = PluginClass<
  LogsSharedClientSetupExports,
  LogsSharedClientStartExports,
  LogsSharedClientSetupDeps,
  LogsSharedClientStartDeps
>;

export type UnwrapPromise<T extends Promise<any>> = T extends Promise<infer Value> ? Value : never;

export type LogsSharedClientStartServicesAccessor = LogsSharedClientCoreSetup['getStartServices'];
export type LogsSharedClientStartServices = UnwrapPromise<
  ReturnType<LogsSharedClientStartServicesAccessor>
>;
