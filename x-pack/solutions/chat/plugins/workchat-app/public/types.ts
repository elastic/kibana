/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { IntegrationComponentDescriptor } from '@kbn/wci-browser';

export interface WorkChatAppPluginSetup {
  integrations: {
    register: (integration: IntegrationComponentDescriptor) => void;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkChatAppPluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkChatAppPluginSetupDependencies {}

export interface WorkChatAppPluginStartDependencies {
  inference: InferencePublicStart;
}
