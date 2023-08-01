/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { AppLeaveHandler, CoreStart } from '@kbn/core/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { DataPublicPluginStart, FilterManager } from '@kbn/data-plugin/public';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { NewsfeedPublicPluginStart } from '@kbn/newsfeed-plugin/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { PluginStart as ListsPluginStart } from '@kbn/lists-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { CasesUiStart } from '@kbn/cases-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { TimelinesUIStart } from '@kbn/timelines-plugin/public';
import type { SessionViewStart } from '@kbn/session-view-plugin/public';
import type { KubernetesSecurityStart } from '@kbn/kubernetes-security-plugin/public';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type { OsqueryPluginStart } from '@kbn/osquery-plugin/public';
import type { LicensingPluginStart, LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { CloudDefendPluginStart } from '@kbn/cloud-defend-plugin/public';
import type { CspClientPluginStart } from '@kbn/cloud-security-posture-plugin/public';
import type { ApmBase } from '@elastic/apm-rum';
import type {
  SavedObjectsTaggingApi,
  SavedObjectTaggingOssPluginStart,
} from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ThreatIntelligencePluginStart } from '@kbn/threat-intelligence-plugin/public';
import type { CloudExperimentsPluginStart } from '@kbn/cloud-experiments-plugin/common';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';

import type { RouteProps } from 'react-router-dom';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { ResolverPluginSetup } from './resolver/types';
import type { Inspect } from '../common/search_strategy';
import type { Detections } from './detections';
import type { Cases } from './cases';
import type { Exceptions } from './exceptions';
import type { Kubernetes } from './kubernetes';
import type { Overview } from './overview';
import type { Rules } from './rules';
import type { Timelines } from './timelines';
import type { Management } from './management';
import type { CloudSecurityPosture } from './cloud_security_posture';
import type { CloudDefend } from './cloud_defend';
import type { ThreatIntelligence } from './threat_intelligence';
import type { SecuritySolutionTemplateWrapper } from './app/home/template_wrapper';
import type { Explore } from './explore';
import type { AppLinksSwitcher, NavigationLink } from './common/links';
import type { EntityAnalytics } from './entity_analytics';

import type { TelemetryClientStart } from './common/lib/telemetry';
import type { Dashboards } from './dashboards';
import type { UpsellingService } from './common/lib/upsellings';
import type { BreadcrumbsNav } from './common/breadcrumbs/types';
import type { TopValuesPopoverService } from './app/components/top_values_popover/top_values_popover_service';

export interface SetupPlugins {
  cloud?: CloudSetup;
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  security: SecurityPluginSetup;
  triggersActionsUi: TriggersActionsSetup;
  usageCollection?: UsageCollectionSetup;
  ml?: MlPluginSetup;
}

/**
 * IMPORTANT - PLEASE READ: When adding new plugins to the
 * security solution, please ensure you add that plugin
 * name to the kibana.jsonc file located in ../kibana.jsonc
 *
 * Without adding the plugin name there, the plugin will not
 * fulfill at runtime, despite the types showing up correctly
 * in the code.
 */
export interface StartPlugins {
  cases: CasesUiStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dashboard?: DashboardStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  fleet?: FleetStart;
  guidedOnboarding: GuidedOnboardingPluginStart;
  kubernetesSecurity: KubernetesSecurityStart;
  lens: LensPublicStart;
  lists?: ListsPluginStart;
  licensing: LicensingPluginStart;
  newsfeed?: NewsfeedPublicPluginStart;
  triggersActionsUi: TriggersActionsStart;
  timelines: TimelinesUIStart;
  sessionView: SessionViewStart;
  uiActions: UiActionsStart;
  ml?: MlPluginStart;
  spaces?: SpacesPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  osquery: OsqueryPluginStart;
  security: SecurityPluginStart;
  cloud?: CloudStart;
  cloudDefend: CloudDefendPluginStart;
  cloudSecurityPosture: CspClientPluginStart;
  threatIntelligence: ThreatIntelligencePluginStart;
  cloudExperiments?: CloudExperimentsPluginStart;
  dataViews: DataViewsServicePublic;
  fieldFormats: FieldFormatsStartCommon;
  discover: DiscoverStart;
  navigation: NavigationPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
}

export interface StartPluginsDependencies extends StartPlugins {
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTaggingOss: SavedObjectTaggingOssPluginStart;
}

export interface ContractStartServices {
  extraRoutes$: Observable<RouteProps[]>;
  isSidebarEnabled$: Observable<boolean>;
  getStartedComponent$: Observable<React.ComponentType | null>;
  upselling: UpsellingService;
}

export type StartServices = CoreStart &
  StartPlugins &
  ContractStartServices & {
    storage: Storage;
    sessionStorage: Storage;
    apm: ApmBase;
    savedObjectsTagging?: SavedObjectsTaggingApi;
    onAppLeave: (handler: AppLeaveHandler) => void;

    /**
     * This component will be exposed to all lazy loaded plugins, via useKibana hook. It should wrap every plugin route.
     * The goal is to allow page property customization (such as `template`).
     */
    securityLayout: {
      getPluginWrapper: () => typeof SecuritySolutionTemplateWrapper;
    };
    savedObjectsManagement: SavedObjectsManagementPluginStart;
    telemetry: TelemetryClientStart;
    discoverFilterManager: FilterManager;
    customDataService: DataPublicPluginStart;
    topValuesPopover: TopValuesPopoverService;
  };

export interface PluginSetup {
  resolver: () => Promise<ResolverPluginSetup>;
  upselling: UpsellingService;
  setAppLinksSwitcher: (appLinksSwitcher: AppLinksSwitcher) => void;
}

export interface PluginStart {
  getNavLinks$: () => Observable<NavigationLink[]>;
  setExtraRoutes: (extraRoutes: RouteProps[]) => void;
  setIsSidebarEnabled: (isSidebarEnabled: boolean) => void;
  setGetStartedPage: (getStartedComponent: React.ComponentType) => void;
  getBreadcrumbsNav$: () => Observable<BreadcrumbsNav>;
}

export interface AppObservableLibs {
  kibana: CoreStart;
}

export type InspectResponse = Inspect & { response: string[] };

export const CASES_SUB_PLUGIN_KEY = 'cases';
export interface SubPlugins {
  [CASES_SUB_PLUGIN_KEY]: Cases;
  alerts: Detections;
  cloudDefend: CloudDefend;
  cloudSecurityPosture: CloudSecurityPosture;
  dashboards: Dashboards;
  exceptions: Exceptions;
  explore: Explore;
  kubernetes: Kubernetes;
  management: Management;
  overview: Overview;
  rules: Rules;
  threatIntelligence: ThreatIntelligence;
  timelines: Timelines;
  entityAnalytics: EntityAnalytics;
}

// TODO: find a better way to defined these types
export interface StartedSubPlugins {
  [CASES_SUB_PLUGIN_KEY]: ReturnType<Cases['start']>;
  alerts: ReturnType<Detections['start']>;
  cloudDefend: ReturnType<CloudDefend['start']>;
  cloudSecurityPosture: ReturnType<CloudSecurityPosture['start']>;
  dashboards: ReturnType<Dashboards['start']>;
  exceptions: ReturnType<Exceptions['start']>;
  explore: ReturnType<Explore['start']>;
  kubernetes: ReturnType<Kubernetes['start']>;
  management: ReturnType<Management['start']>;
  overview: ReturnType<Overview['start']>;
  rules: ReturnType<Rules['start']>;
  threatIntelligence: ReturnType<ThreatIntelligence['start']>;
  timelines: ReturnType<Timelines['start']>;
  entityAnalytics: ReturnType<EntityAnalytics['start']>;
}
