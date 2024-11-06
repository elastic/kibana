/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  StreamsAPIPublicSetup,
  StreamsAPIPublicStart,
} from '@kbn/streams-api-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type {
  UnifiedSearchPluginSetup,
  UnifiedSearchPublicPluginStart,
} from '@kbn/unified-search-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface StreamsAppSetupDependencies {
  observabilityShared: ObservabilitySharedPluginSetup;
  streamsAPI: StreamsAPIPublicSetup;
  data: DataPublicPluginSetup;
  dataViews: DataViewsPublicPluginSetup;
  unifiedSearch: UnifiedSearchPluginSetup;
}

export interface StreamsAppStartDependencies {
  observabilityShared: ObservabilitySharedPluginStart;
  streamsAPI: StreamsAPIPublicStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface StreamsAppPublicSetup {}

export interface StreamsAppPublicStart {}
