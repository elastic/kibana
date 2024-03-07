/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiopsPluginStart } from '@kbn/aiops-plugin/public/types';
import type { CasesUiStart } from '@kbn/cases-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type { HomePublicPluginStart } from '@kbn/home-plugin/public';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type {
  ActionTypeRegistryContract,
  RuleTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface ConfigSchema {
  unsafe: {
    alertDetails: {
      metrics: {
        enabled: boolean;
      };
      logs?: {
        enabled: boolean;
      };
      uptime: {
        enabled: boolean;
      };
      observability?: {
        enabled: boolean;
      };
    };
    thresholdRule?: {
      enabled: boolean;
    };
  };
}

export interface ObservabilityPluginSetupDependencies {
  data: DataPublicPluginSetup;
  dataViews: DataViewsPublicPluginSetup;
  features: FeaturesPluginSetup;
  lens: LensPublicSetup;
  ml: MlPluginSetup;
  security: SecurityPluginSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
}

export interface ObservabilityPluginStartDependencies {
  actionTypeRegistry: ActionTypeRegistryContract;
  aiops: AiopsPluginStart;
  cases: CasesUiStart;
  charts: ChartsPluginStart;
  cloud?: CloudStart;
  contentManagement: ContentManagementPublicStart;

  data: DataPublicPluginStart;
  dataViewEditor: DataViewEditorStart;

  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  embeddable: EmbeddableStart;

  features: FeaturesPluginStart;
  fieldFormats: FieldFormatsStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  home?: HomePublicPluginStart;

  lens: LensPublicStart;
  licensing: LicensingPluginStart;

  ml: MlPluginStart;

  presentationUtil?: PresentationUtilPluginStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
  security: SecurityPluginStart;

  serverless?: ServerlessPluginStart;
  share: SharePluginStart;

  spaces?: SpacesPluginStart;
  theme: CoreStart['theme'];
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;

  uiActions: UiActionsStart;

  uiSettings: IUiSettingsClient;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface ObservabilityPluginSetup {}

export interface ObservabilityPluginStart {}
