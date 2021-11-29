/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { CoreStart } from '../../../../src/core/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { LensPublicStart } from '../../../plugins/lens/public';
import { NewsfeedPublicPluginStart } from '../../../../src/plugins/newsfeed/public';
import { Start as InspectorStart } from '../../../../src/plugins/inspector/public';
import { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { FleetStart } from '../../fleet/public';
import { PluginStart as ListsPluginStart } from '../../lists/public';
import { SpacesPluginStart } from '../../spaces/public';
import {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from '../../triggers_actions_ui/public';
import { CasesUiStart } from '../../cases/public';
import { SecurityPluginSetup } from '../../security/public';
import { TimelinesUIStart } from '../../timelines/public';
import { ResolverPluginSetup } from './resolver/types';
import { Inspect } from '../common/search_strategy';
import { MlPluginSetup, MlPluginStart } from '../../ml/public';

import { Detections } from './detections';
import { Cases } from './cases';
import { Exceptions } from './exceptions';
import { Hosts } from './hosts';
import { Network } from './network';
import { Overview } from './overview';
import { Rules } from './rules';
import { Timelines } from './timelines';
import { Management } from './management';
import { Ueba } from './ueba';
import { CloudPosture } from './cloud_posture';
import { LicensingPluginStart, LicensingPluginSetup } from '../../licensing/public';
import { DashboardStart } from '../../../../src/plugins/dashboard/public';
import { IndexPatternFieldEditorStart } from '../../../../src/plugins/data_view_field_editor/public';

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
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
  navigation: NavigationPublicPluginStart; // remove?
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
  network: Network;
  ueba: Ueba;
  overview: Overview;
  timelines: Timelines;
  management: Management;
  cloud_posture: CloudPosture;
}

// TODO: find a better way to defined these types
export interface StartedSubPlugins {
  alerts: ReturnType<Detections['start']>;
  rules: ReturnType<Rules['start']>;
  exceptions: ReturnType<Exceptions['start']>;
  [CASES_SUB_PLUGIN_KEY]: ReturnType<Cases['start']>;
  hosts: ReturnType<Hosts['start']>;
  network: ReturnType<Network['start']>;
  ueba: ReturnType<Ueba['start']>;
  overview: ReturnType<Overview['start']>;
  timelines: ReturnType<Timelines['start']>;
  management: ReturnType<Management['start']>;
  cloud_posture: ReturnType<CloudPosture['start']>;
}
