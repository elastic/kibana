/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityAIAssistantAppPublicStart {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityAIAssistantAppPublicSetup {}

export interface ObservabilityAIAssistantAppPluginStartDependencies {
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
}

export interface ObservabilityAIAssistantAppPluginSetupDependencies {
  lens: LensPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  uiActions: UiActionsSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPublicSetup;
}
