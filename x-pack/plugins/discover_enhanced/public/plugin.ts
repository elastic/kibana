/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { PluginInitializerContext } from 'kibana/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { createStartServicesGetter } from '../../../../src/plugins/kibana_utils/public';
import { SharePluginSetup, SharePluginStart } from '../../../../src/plugins/share/public';
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
  embeddable: EmbeddableSetup;
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
}

export interface DiscoverEnhancedStartDependencies {
  embeddable: EmbeddableStart;
  share?: SharePluginStart;
  uiActions: UiActionsStart;
}

export class DiscoverEnhancedPlugin
  implements
    Plugin<void, void, DiscoverEnhancedSetupDependencies, DiscoverEnhancedStartDependencies> {
  constructor(public readonly initializerContext: PluginInitializerContext) {}

  setup(
    core: CoreSetup<DiscoverEnhancedStartDependencies>,
    { uiActions, share }: DiscoverEnhancedSetupDependencies
  ) {
    const start = createStartServicesGetter(core.getStartServices);

    if (!!share) {
      const viewInDiscoverAction = new ViewInDiscoverAction({ start });
      uiActions.attachAction(CONTEXT_MENU_TRIGGER, viewInDiscoverAction);
    }
  }

  start(core: CoreStart, plugins: DiscoverEnhancedStartDependencies) {}

  stop() {}
}
