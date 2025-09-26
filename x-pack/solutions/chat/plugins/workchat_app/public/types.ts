/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { DataSourcesRegistryPluginSetup } from '@kbn/data-sources-registry-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkChatAppPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkChatAppPluginStart {}

export interface WorkChatAppPluginSetupDependencies {
  dataSourcesRegistry: DataSourcesRegistryPluginSetup;
}

export interface WorkChatAppPluginStartDependencies {
  inference: InferencePublicStart;
}
