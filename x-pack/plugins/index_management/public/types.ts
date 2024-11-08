/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnalyticsServiceStart,
  I18nStart,
  OverlayStart,
  ThemeServiceStart,
} from '@kbn/core/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { ConsolePluginStart } from '@kbn/console-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';

export interface IndexManagementStartServices {
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  i18n: I18nStart;
  overlays: OverlayStart;
  theme: Pick<ThemeServiceStart, 'theme$'>;
}

export interface SetupDependencies {
  fleet?: unknown;
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
  share: SharePluginSetup;
  cloud?: CloudSetup;
}

export interface StartDependencies {
  cloud?: CloudSetup;
  console?: ConsolePluginStart;
  share: SharePluginStart;
  fleet?: unknown;
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
  licensing?: LicensingPluginStart;
  ml?: MlPluginStart;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
  enableIndexActions?: boolean;
  enableLegacyTemplates?: boolean;
  enableIndexStats?: boolean;
  enableSizeAndDocCount?: boolean;
  enableDataStreamStats?: boolean;
  editableIndexSettings?: 'all' | 'limited';
  enableMappingsSourceFieldSection?: boolean;
  enableTogglingDataRetention?: boolean;
  enableProjectLevelRetentionChecks?: boolean;
  dev: {
    enableSemanticText?: boolean;
  };
}
