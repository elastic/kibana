/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { PluginInitializerContext } from 'kibana/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import {
  EmbeddableSetup,
  EmbeddableStart,
  EmbeddableContext,
  CONTEXT_MENU_TRIGGER,
} from '../../../../src/plugins/embeddable/public';
import { ViewInDiscoverAction, ACTION_VIEW_IN_DISCOVER } from './actions';

declare module '../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_VIEW_IN_DISCOVER]: EmbeddableContext;
  }
}

export interface DiscoverEnhancedSetupDependencies {
  uiActions: UiActionsSetup;
  embeddable: EmbeddableSetup;
}

export interface DiscoverEnhancedStartDependencies {
  uiActions: UiActionsStart;
  embeddable: EmbeddableStart;
}

export class DiscoverEnhancedPlugin
  implements
    Plugin<void, void, DiscoverEnhancedSetupDependencies, DiscoverEnhancedStartDependencies> {
  constructor(public readonly initializerContext: PluginInitializerContext) {}

  setup(
    core: CoreSetup<DiscoverEnhancedStartDependencies>,
    { uiActions }: DiscoverEnhancedSetupDependencies
  ) {
    const viewInDiscoverAction = new ViewInDiscoverAction();
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, viewInDiscoverAction);
  }

  start(core: CoreStart, plugins: DiscoverEnhancedStartDependencies) {}

  stop() {}
}
