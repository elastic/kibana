/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';

import { PreloadedState, Middleware, Dispatch } from 'redux';
import { AppApolloClient, AppFrontendLibs } from './common/lib/lib';
import { SubPluginsInitReducer } from './common/store/reducer';

import { SecuritySubPlugins, RenderAppProps } from './app/types';

import { Detections } from './detections';
import { Cases } from './cases';
import { Hosts } from './hosts';
import { Network } from './network';
import { Overview } from './overview';
import { Timelines } from './timelines';
import { Management } from './management';

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
import { ResolverPluginSetup } from './resolver/types';
import { Inspect } from '../common/search_strategy';
import { MlPluginSetup, MlPluginStart } from '../../ml/public';
import { State } from './common/store/types';
import { KibanaIndexPatterns } from './common/store/sourcerer/model';
import { AppAction } from './common/store/actions';
import { SecurityAppStore } from './common/store/store';
import { Immutable } from '../common/endpoint/types';

export interface SetupPlugins {
  home?: HomePublicPluginSetup;
  security: SecurityPluginSetup;
  triggers_actions_ui: TriggersActionsSetup;
  usageCollection?: UsageCollectionSetup;
  ml?: MlPluginSetup;
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

/**
 * The classes used to instantiate the sub plugins. These are grouped into a single object for the sake of bundling them in a single dynamic import.
 */
export interface SubPluginClasses {
  Detections: new () => Detections;
  Cases: new () => Cases;
  Hosts: new () => Hosts;
  Network: new () => Network;
  Overview: new () => Overview;
  Timelines: new () => Timelines;
  Management: new () => Management;
}

/**
 * These dependencies are needed to mount the applications registered by this plugin. They are grouped into a single object for the sake of bundling the in a single Webpack chunk.
 */
export interface LazyApplicationDependencies {
  subPluginClasses: SubPluginClasses;
  renderApp: (renderAppProps: RenderAppProps) => () => void;
  composeLibs: (core: CoreStart) => AppFrontendLibs;
  createInitialState: (
    pluginsInitState: SecuritySubPlugins['store']['initialState'],
    patterns: { kibanaIndexPatterns: KibanaIndexPatterns; configIndexPatterns: string[] }
  ) => PreloadedState<State>;
  createStore(
    state: PreloadedState<State>,
    pluginsReducer: SubPluginsInitReducer,
    apolloClient: Observable<AppApolloClient>,
    kibana: Observable<CoreStart>,
    storage: Storage,
    additionalMiddleware?: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>
  ): SecurityAppStore;
}
