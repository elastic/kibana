/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreStart } from '../../../../src/core/public';

import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { Start as NewsfeedStart } from '../../../../src/plugins/newsfeed/public';
import { Start as InspectorStart } from '../../../../src/plugins/inspector/public';
import { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { IngestManagerStart } from '../../ingest_manager/public';
import { PluginStart as ListsPluginStart } from '../../lists/public';
import {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from '../../triggers_actions_ui/public';
import { SecurityPluginSetup } from '../../security/public';
import { AppFrontendLibs } from './common/lib/lib';
import { ResolverPluginSetup } from './resolver/types';

export interface SetupPlugins {
  home?: HomePublicPluginSetup;
  security: SecurityPluginSetup;
  triggers_actions_ui: TriggersActionsSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface StartPlugins {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  ingestManager?: IngestManagerStart;
  lists?: ListsPluginStart;
  newsfeed?: NewsfeedStart;
  triggers_actions_ui: TriggersActionsStart;
  uiActions: UiActionsStart;
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
