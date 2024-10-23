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
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  AIAssistantManagementSelectionPluginPublicStart,
  AIAssistantManagementSelectionPluginPublicSetup,
} from '@kbn/ai-assistant-management-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityAIAssistantAppPublicStart {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityAIAssistantAppPublicSetup {}

export interface ObservabilityAIAssistantAppPluginStartDependencies {
  licensing: LicensingPluginStart;
  share: SharePluginStart;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  ml: MlPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
  aiAssistantManagementSelection: AIAssistantManagementSelectionPluginPublicStart;
}

export interface ObservabilityAIAssistantAppPluginSetupDependencies {
  licensing: LicensingPluginSetup;
  share: SharePluginSetup;
  lens: LensPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  uiActions: UiActionsSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  ml: MlPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  aiAssistantManagementSelection: AIAssistantManagementSelectionPluginPublicSetup;
}
