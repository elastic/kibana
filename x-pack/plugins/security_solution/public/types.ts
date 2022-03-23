/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '../../../../src/core/public';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import type { LensPublicStart } from '../../../plugins/lens/public';
import type { NewsfeedPublicPluginStart } from '../../../../src/plugins/newsfeed/public';
import type { Start as InspectorStart } from '../../../../src/plugins/inspector/public';
import type { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import type { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import type { Storage } from '../../../../src/plugins/kibana_utils/public';
import type { FleetStart } from '../../fleet/public';
import type { PluginStart as ListsPluginStart } from '../../lists/public';
import type { SpacesPluginStart } from '../../spaces/public';
import type {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from '../../triggers_actions_ui/public';
import type { CasesUiStart } from '../../cases/public';
import type { SecurityPluginSetup } from '../../security/public';
import type { TimelinesUIStart } from '../../timelines/public';
import type { SessionViewUIStart } from '../../session_view/public';
import type { ResolverPluginSetup } from './resolver/types';
import type { Inspect } from '../common/search_strategy';
import type { MlPluginSetup, MlPluginStart } from '../../ml/public';
import type { OsqueryPluginStart } from '../../osquery/public';
import type { Detections } from './detections';
import type { Cases } from './cases';
import type { Exceptions } from './exceptions';
import type { Hosts } from './hosts';
import type { Users } from './users';
import type { Network } from './network';
import type { Overview } from './overview';
import type { Rules } from './rules';
import type { Timelines } from './timelines';
import type { Management } from './management';
import type { LicensingPluginStart, LicensingPluginSetup } from '../../licensing/public';
import type { DashboardStart } from '../../../../src/plugins/dashboard/public';
import type { IndexPatternFieldEditorStart } from '../../../../src/plugins/data_view_field_editor/public';

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
  dashboard?: DashboardStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  fleet?: FleetStart;
  lens: LensPublicStart;
  lists?: ListsPluginStart;
  licensing: LicensingPluginStart;
  newsfeed?: NewsfeedPublicPluginStart;
  triggersActionsUi: TriggersActionsStart;
  timelines: TimelinesUIStart;
  uiActions: UiActionsStart;
  ml?: MlPluginStart;
  spaces?: SpacesPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  osquery?: OsqueryPluginStart;
  sessionView: SessionViewUIStart;
}

export type StartServices = CoreStart &
  StartPlugins & {
    security: SecurityPluginSetup;
    storage: Storage;
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
  hosts: Hosts;
  users: Users;
  network: Network;
  overview: Overview;
  timelines: Timelines;
  management: Management;
}

// TODO: find a better way to defined these types
export interface StartedSubPlugins {
  alerts: ReturnType<Detections['start']>;
  rules: ReturnType<Rules['start']>;
  exceptions: ReturnType<Exceptions['start']>;
  [CASES_SUB_PLUGIN_KEY]: ReturnType<Cases['start']>;
  hosts: ReturnType<Hosts['start']>;
  users: ReturnType<Users['start']>;
  network: ReturnType<Network['start']>;
  overview: ReturnType<Overview['start']>;
  timelines: ReturnType<Timelines['start']>;
  management: ReturnType<Management['start']>;
}
