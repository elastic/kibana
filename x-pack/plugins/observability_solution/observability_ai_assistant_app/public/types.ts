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
import type { SecurityPluginStart, SecurityPluginSetup } from '@kbn/security-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityAIAssistantAppPublicStart {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityAIAssistantAppPublicSetup {}

export interface ObservabilityAIAssistantAppPluginStartDependencies {
  license: LicensingPluginStart;
  share: SharePluginStart;
  security: SecurityPluginStart;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
}

export interface ObservabilityAIAssistantAppPluginSetupDependencies {
  license: LicensingPluginSetup;
  share: SharePluginSetup;
  security: SecurityPluginSetup;
  lens: LensPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  uiActions: UiActionsSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
}
