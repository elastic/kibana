/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverStart } from '../../../../src/plugins/discover/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { FleetStart } from '../../fleet/public';
import { LensPublicStart } from '../../../plugins/lens/public';
import { CoreStart } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../triggers_actions_ui/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OsqueryPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OsqueryPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export interface StartPlugins {
  discover: DiscoverStart;
  data: DataPublicPluginStart;
  fleet: FleetStart;
  lens?: LensPublicStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export interface SetupPlugins {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

export type StartServices = CoreStart & StartPlugins;
