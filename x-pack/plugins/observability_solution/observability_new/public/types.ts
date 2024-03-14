/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetupContract as AlertingPluginPublicSetup,
  PluginStartContract as AlertingPluginPublicStart,
} from '@kbn/alerting-plugin/public';
import type { AiopsPluginStart } from '@kbn/aiops-plugin/public/types';
import type { CasesUiStart } from '@kbn/cases-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import type { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { MetricsDataPluginStart } from '@kbn/metrics-data-access-plugin/public';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { ProfilingPluginSetup, ProfilingPluginStart } from '@kbn/profiling-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type {
  ActionTypeRegistryContract,
  RuleTypeRegistryContract,
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface ConfigSchema {
  apm: {
    serviceMapEnabled: boolean;
    ui: {
      enabled: boolean;
    };
    latestAgentVersionsUrl: string;
    serverlessOnboarding: boolean;
    managedServiceUrl: string;
    featureFlags: {
      agentConfigurationAvailable: boolean;
      configurableIndicesAvailable: boolean;
      infrastructureTabAvailable: boolean;
      infraUiAvailable: boolean;
      migrationToFleetAvailable: boolean;
      sourcemapApiAvailable: boolean;
      storageExplorerAvailable: boolean;
      profilingIntegrationAvailable: boolean;
    };
    serverless: {
      enabled: boolean;
    };
  };
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
  alerting?: AlertingPluginPublicSetup;
  cloud?: CloudSetup;
  data: DataPublicPluginSetup;
  dataViews: DataViewsPublicPluginSetup;
  discover?: DiscoverSetup;
  // exploratoryView: ExploratoryViewPublicSetup;
  features: FeaturesPluginSetup;
  home?: HomePublicPluginSetup;
  lens: LensPublicSetup;
  licenseManagement?: LicenseManagementUIPluginSetup;
  licensing: LicensingPluginSetup;
  ml: MlPluginSetup;
  profiling?: ProfilingPluginSetup;
  security: SecurityPluginSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  uiActions: UiActionsSetup;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  usageCollection: UsageCollectionSetup;
}

export interface ObservabilityPluginStartDependencies {
  actionTypeRegistry: ActionTypeRegistryContract;
  aiops: AiopsPluginStart;
  alerting?: AlertingPluginPublicStart;
  cases: CasesUiStart;
  charts: ChartsPluginStart;
  cloud?: CloudStart;
  contentManagement: ContentManagementPublicStart;
  dashboard: DashboardStart;
  data: DataPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  embeddable: EmbeddableStart;
  features: FeaturesPluginStart;
  fieldFormats?: FieldFormatsStart;
  fleet?: FleetStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  home: HomePublicPluginStart;
  inspector: InspectorPluginStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  maps?: MapsStartApi;
  metricsDataAccess: MetricsDataPluginStart;
  ml: MlPluginStart;
  presentationUtil?: PresentationUtilPluginStart;
  profiling?: ProfilingPluginStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
  security: SecurityPluginStart;
  serverless?: ServerlessPluginStart;
  share: SharePluginStart;
  spaces?: SpacesPluginStart;
  storage: IStorageWrapper;
  theme: CoreStart['theme'];
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  uiActions: UiActionsStart;
  uiSettings: IUiSettingsClient;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface ObservabilityPluginSetup {}

export interface ObservabilityPluginStart {}
