/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverStart } from '@kbn/discover-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FleetStart } from '@kbn/fleet-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { getLazyOsqueryAction } from './shared_components';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OsqueryPluginSetup {}
export interface OsqueryPluginStart {
  OsqueryAction?: ReturnType<typeof getLazyOsqueryAction>;
  isOsqueryAvailable: (props: { agentId: string }) => boolean;
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
}

export interface SetupPlugins {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

export type StartServices = CoreStart & StartPlugins;
