/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SecurityPluginStart, SecurityPluginSetup } from '@kbn/security-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

export interface AiopsApiPluginSetupDeps {
  licensing: LicensingPluginSetup;
  security: SecurityPluginSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPublicSetup;
}

export interface AiopsApiPluginStartDeps {
  licensing: LicensingPluginStart;
  share: SharePluginStart;
  security: SecurityPluginStart;
  lens: LensPublicStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  storage: IStorageWrapper;
  executionContext: ExecutionContextStart;
  usageCollection: UsageCollectionSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
}

export type AiopsApiPluginSetup = void;
export type AiopsApiPluginStart = void;
