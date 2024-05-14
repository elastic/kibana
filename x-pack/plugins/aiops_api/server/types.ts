/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetup, PluginStart } from '@kbn/data-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type {
  ObservabilityAIAssistantServerSetup,
  ObservabilityAIAssistantServerStart,
} from '@kbn/observability-ai-assistant-plugin/server';
import type { IUiSettingsClient } from '@kbn/core/public';

export interface AiopsApiPluginSetupDeps {
  data: PluginSetup;
  licensing: LicensingPluginSetup;
  observabilityAIAssistant: ObservabilityAIAssistantServerSetup;
  cases?: CasesServerSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface AiopsApiPluginStartDeps {
  data: PluginStart;
  fieldFormats: FieldFormatsStart;
  uiSettings: IUiSettingsClient;
  observabilityAIAssistant: ObservabilityAIAssistantServerStart;
}

/**
 * aiops API plugin server setup contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiopsApiPluginSetup {}

/**
 * aiops API plugin server start contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiopsApiPluginStart {}

export interface AiopsApiLicense {
  isActivePlatinumLicense: boolean;
}
