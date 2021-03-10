/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'src/core/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { EmbeddableStart } from 'src/plugins/embeddable/public';
import { NewsfeedPublicPluginStart } from 'src/plugins/newsfeed/public';
import { Start as InspectorStart } from 'src/plugins/inspector/public';
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { TelemetryManagementSectionPluginSetup } from 'src/plugins/telemetry_management_section/public';
import { Storage } from 'src/plugins/kibana_utils/public';
import { FleetStart } from 'x-pack/plugins/fleet/public';
import { PluginStart as ListsPluginStart } from 'x-pack/plugins/lists/public';
import {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from 'x-pack/plugins/triggers_actions_ui/public';
import { SecurityPluginSetup } from 'x-pack/plugins/security/public';
import { MlPluginSetup, MlPluginStart } from 'x-pack/plugins/ml/public';
import { LicensingPluginStart, LicensingPluginSetup } from 'x-pack/plugins/licensing/public';
import { ResolverPluginSetup } from './resolver/types';
import { Inspect } from '../common/search_strategy';

import { Detections } from './detections';
import { Cases } from './cases';
import { Hosts } from './hosts';
import { Network } from './network';
import { Overview } from './overview';
import { Timelines } from './timelines';
import { Management } from './management';
import { AppFrontendLibs } from './common/lib/lib';

export interface SetupPlugins {
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  security: SecurityPluginSetup;
  triggersActionsUi: TriggersActionsSetup;
  usageCollection?: UsageCollectionSetup;
  telemetryManagementSection?: TelemetryManagementSectionPluginSetup;
  ml?: MlPluginSetup;
}

export interface StartPlugins {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  fleet?: FleetStart;
  lists?: ListsPluginStart;
  licensing: LicensingPluginStart;
  newsfeed?: NewsfeedPublicPluginStart;
  triggersActionsUi: TriggersActionsStart;
  uiActions: UiActionsStart;
  ml?: MlPluginStart;
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

export interface AppObservableLibs extends AppFrontendLibs {
  kibana: CoreStart;
}

export type InspectResponse = Inspect & { response: string[] };

export interface SubPlugins {
  detections: Detections;
  cases: Cases;
  hosts: Hosts;
  network: Network;
  overview: Overview;
  timelines: Timelines;
  management: Management;
}
