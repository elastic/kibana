/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppLeaveHandler, CoreStart } from '@kbn/core/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
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
import type { CspClientPluginStart } from '@kbn/cloud-security-posture-plugin/public';
import type { ApmBase } from '@elastic/apm-rum';
import type {
  SavedObjectsTaggingApi,
  SavedObjectTaggingOssPluginStart,
} from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ThreatIntelligencePluginStart } from '@kbn/threat-intelligence-plugin/public';
import type { CloudExperimentsPluginStart } from '@kbn/cloud-experiments-plugin/common';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
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
import type { ThreatIntelligence } from './threat_intelligence';
import type { SecuritySolutionTemplateWrapper } from './app/home/template_wrapper';
import type { Explore } from './explore';

export interface SetupPlugins {
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  security: SecurityPluginSetup;
  triggersActionsUi: TriggersActionsSetup;
  usageCollection?: UsageCollectionSetup;
  ml?: MlPluginSetup;
}

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
  cloudSecurityPosture: CspClientPluginStart;
  threatIntelligence: ThreatIntelligencePluginStart;
  cloudExperiments?: CloudExperimentsPluginStart;
}

export interface StartPluginsDependencies extends StartPlugins {
  savedObjectsTaggingOss: SavedObjectTaggingOssPluginStart;
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
  };

export interface PluginSetup {
  resolver: () => Promise<ResolverPluginSetup>;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

export interface AppObservableLibs {
  kibana: CoreStart;
}

export type InspectResponse = Inspect & { response: string[] };

export const CASES_SUB_PLUGIN_KEY = 'cases';
export interface SubPlugins {
  alerts: Detections;
  rules: Rules;
  exceptions: Exceptions;
  [CASES_SUB_PLUGIN_KEY]: Cases;
  explore: Explore;
  kubernetes: Kubernetes;
  overview: Overview;
  timelines: Timelines;
  management: Management;
  landingPages: LandingPages;
  cloudSecurityPosture: CloudSecurityPosture;
  threatIntelligence: ThreatIntelligence;
}

// TODO: find a better way to defined these types
export interface StartedSubPlugins {
  alerts: ReturnType<Detections['start']>;
  rules: ReturnType<Rules['start']>;
  exceptions: ReturnType<Exceptions['start']>;
  [CASES_SUB_PLUGIN_KEY]: ReturnType<Cases['start']>;
  explore: ReturnType<Explore['start']>;
  kubernetes: ReturnType<Kubernetes['start']>;
  overview: ReturnType<Overview['start']>;
  timelines: ReturnType<Timelines['start']>;
  management: ReturnType<Management['start']>;
  landingPages: ReturnType<LandingPages['start']>;
  cloudSecurityPosture: ReturnType<CloudSecurityPosture['start']>;
  threatIntelligence: ReturnType<ThreatIntelligence['start']>;
}
