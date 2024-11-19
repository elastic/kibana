/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { CasesPublicStart, CasesPublicSetup } from '@kbn/cases-plugin/public';
import type { TimelinesUIStart } from '@kbn/timelines-plugin/public';
import type {
  getLazyLiveQueryField,
  getLazyOsqueryAction,
  getLazyOsqueryResponseActionTypeForm,
  getLazyOsqueryResult,
} from './shared_components';
import type { useAllLiveQueries, UseAllLiveQueriesConfig } from './actions/use_all_live_queries';
import type { getLazyOsqueryResults } from './shared_components/lazy_osquery_results';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OsqueryPluginSetup {}

export interface OsqueryPluginStart {
  OsqueryAction?: ReturnType<typeof getLazyOsqueryAction>;
  OsqueryResult: ReturnType<typeof getLazyOsqueryResult>;
  OsqueryResults: ReturnType<typeof getLazyOsqueryResults>;
  LiveQueryField?: ReturnType<typeof getLazyLiveQueryField>;
  isOsqueryAvailable: (props: { agentId: string }) => boolean;
  fetchInstallationStatus: () => { loading: boolean; disabled: boolean; permissionDenied: boolean };
  OsqueryResponseActionTypeForm: ReturnType<typeof getLazyOsqueryResponseActionTypeForm>;
  fetchAllLiveQueries: (config: UseAllLiveQueriesConfig) => ReturnType<typeof useAllLiveQueries>;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export interface StartPlugins {
  discover: DiscoverStart;
  data: DataPublicPluginStart;
  fleet: FleetStart;
  lens?: LensPublicStart;
  security: SecurityPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  cases: CasesPublicStart;
  timelines: TimelinesUIStart;
  appName?: string;
}

export interface SetupPlugins {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  cases?: CasesPublicSetup;
}

export type StartServices = CoreStart & StartPlugins;
