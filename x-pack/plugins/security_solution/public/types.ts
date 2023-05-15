/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BehaviorSubject, Observable } from 'rxjs';
import type { History } from 'history';

import type {
  AppLeaveHandler,
  ApplicationStart,
  Capabilities,
  ChromeStart,
  CoreStart,
  DocLinksStart,
  PluginInitializerContext,
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
  ToastsStart,
} from '@kbn/core/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type {
  DataPublicPluginStart,
  FilterManager,
  TimefilterContract,
} from '@kbn/data-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { NewsfeedPublicPluginStart } from '@kbn/newsfeed-plugin/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
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

import type { UiCounterMetricType } from '@kbn/analytics';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DiscoverAppLocator } from '@kbn/discover-plugin/common';
import type { DiscoverContextAppLocator } from '@kbn/discover-plugin/public/application/context/services/locator';
import type { DiscoverSingleDocLocator } from '@kbn/discover-plugin/public/application/doc/locator';
import type { HistoryLocationState } from '@kbn/discover-plugin/public/build_services';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import { memoize, once } from 'lodash';
import { useHistory } from 'react-router-dom';
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
import type { LandingPages } from './landing_pages';
import type { CloudSecurityPosture } from './cloud_security_posture';
import type { CloudDefend } from './cloud_defend';
import type { ThreatIntelligence } from './threat_intelligence';
import type { SecuritySolutionTemplateWrapper } from './app/home/template_wrapper';
import type { Explore } from './explore';
import type { NavigationLink } from './common/links';

import type { TelemetryClientStart } from './common/lib/telemetry';
import type { Dashboards } from './dashboards';

export interface SetupPlugins {
  cloud?: CloudSetup;
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  security: SecurityPluginSetup;
  share: SharePluginStart;
  triggersActionsUi: TriggersActionsSetup;
  usageCollection?: UsageCollectionSetup;
  ml?: MlPluginSetup;
}

export interface StartPlugins {
  addBasePath: (path: string) => string;
  application: ApplicationStart;
  capabilities: Capabilities;
  charts: ChartsPluginStart;
  chrome: ChromeStart;
  contextLocator: DiscoverContextAppLocator;
  core: CoreStart;
  dataViewEditor: DataViewEditorStart;
  docLinks: DocLinksStart;
  expressions: ExpressionsStart;
  fieldFormats: FieldFormatsStart;
  filterManager: FilterManager;
  history: () => History<HistoryLocationState>;
  http: HttpStart;
  locator: DiscoverAppLocator;
  metadata: { branch: string };
  navigation: NavigationPublicPluginStart;
  notifications: NotificationsStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTagging?: SavedObjectsTaggingApi;
  settings: SettingsStart;
  share?: SharePluginStart;
  singleDocLocator: DiscoverSingleDocLocator;
  storage: Storage;
  theme: ChartsPluginStart['theme'];
  timefilter: TimefilterContract;
  toastNotifications: ToastsStart;
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  uiSettings: IUiSettingsClient;
  urlForwarding: UrlForwardingStart;

  // Previous Existing
  cases: CasesUiStart;
  cloud?: CloudStart;
  cloudDefend: CloudDefendPluginStart;
  cloudExperiments?: CloudExperimentsPluginStart;
  cloudSecurityPosture: CspClientPluginStart;
  dashboard?: DashboardStart;
  data: DataPublicPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViews: DataViewsServicePublic;
  embeddable: EmbeddableStart;
  fleet?: FleetStart;
  guidedOnboarding: GuidedOnboardingPluginStart;
  inspector: InspectorStart;
  kubernetesSecurity: KubernetesSecurityStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  lists?: ListsPluginStart;
  ml?: MlPluginStart;
  newsfeed?: NewsfeedPublicPluginStart;
  osquery: OsqueryPluginStart;
  savedObjectsTaggingOss: SavedObjectTaggingOssPluginStart;
  security: SecurityPluginStart;
  sessionView: SessionViewStart;
  spaces?: SpacesPluginStart;
  threatIntelligence: ThreatIntelligencePluginStart;
  timelines: TimelinesUIStart;
  triggersActionsUi: TriggersActionsStart;
  uiActions: UiActionsStart;
  usageCollection: UsageCollectionSetup;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface StartPluginsDependencies extends StartPlugins {
  savedObjectsManagement: SavedObjectsManagementPluginStart;
}

export type StartServices = CoreStart &
  StartPlugins & {
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
    isSidebarEnabled$: BehaviorSubject<boolean>;
    telemetry: TelemetryClientStart;
  };

export interface PluginSetup {
  resolver: () => Promise<ResolverPluginSetup>;
}

export interface PluginStart {
  getNavLinks$: () => Observable<NavigationLink[]>;
  setIsSidebarEnabled: (isSidebarEnabled: boolean) => void;
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
  landingPages: LandingPages;
  management: Management;
  overview: Overview;
  rules: Rules;
  threatIntelligence: ThreatIntelligence;
  timelines: Timelines;
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
  landingPages: ReturnType<LandingPages['start']>;
  management: ReturnType<Management['start']>;
  overview: ReturnType<Overview['start']>;
  rules: ReturnType<Rules['start']>;
  threatIntelligence: ReturnType<ThreatIntelligence['start']>;
  timelines: ReturnType<Timelines['start']>;
}

export const useGetHistory = once(() => {
  const history = useHistory();
  history.listen(() => {
    // keep at least one listener so that `history.location` always in sync
  });
  return history;
});

export const buildDiscoverServices = memoize(function (
  core: CoreStart,
  plugins: StartPlugins,
  context: PluginInitializerContext,
  locator: DiscoverAppLocator,
  contextLocator: DiscoverContextAppLocator,
  singleDocLocator: DiscoverSingleDocLocator
) {
  const { usageCollection } = plugins;
  const storage = new Storage(localStorage);

  return {
    application: core.application,
    addBasePath: core.http.basePath.prepend,
    capabilities: core.application.capabilities,
    chrome: core.chrome,
    core,
    data: plugins.data,
    docLinks: core.docLinks,
    embeddable: plugins.embeddable,
    theme: plugins.charts.theme,
    fieldFormats: plugins.fieldFormats,
    filterManager: plugins.data.query.filterManager,
    history: useGetHistory,
    dataViews: plugins.data.dataViews,
    inspector: plugins.inspector,
    metadata: {
      branch: context.env.packageInfo.branch,
    },
    navigation: plugins.navigation,
    share: plugins.share,
    urlForwarding: plugins.urlForwarding,
    timefilter: plugins.data.query.timefilter.timefilter,
    toastNotifications: core.notifications.toasts,
    notifications: core.notifications,
    uiSettings: core.uiSettings,
    settings: core.settings,
    storage,
    trackUiMetric: usageCollection?.reportUiCounter.bind(usageCollection, 'discover'),
    dataViewFieldEditor: plugins.dataViewFieldEditor,
    http: core.http,
    spaces: plugins.spaces,
    dataViewEditor: plugins.dataViewEditor,
    triggersActionsUi: plugins.triggersActionsUi,
    locator,
    contextLocator,
    singleDocLocator,
    expressions: plugins.expressions,
    charts: plugins.charts,
    savedObjectsTagging: plugins.savedObjectsTaggingOss?.getTaggingApi(),
    savedObjectsManagement: plugins.savedObjectsManagement,
    unifiedSearch: plugins.unifiedSearch,
    lens: plugins.lens,
  };
});
