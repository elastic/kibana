/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { PluginInitializerContext } from 'kibana/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { createStartServicesGetter } from '../../../../src/plugins/kibana_utils/public';
import { DiscoverSetup, DiscoverStart } from '../../../../src/plugins/discover/public';
import {
  EmbeddableSetup,
  EmbeddableStart,
  EmbeddableContext,
  CONTEXT_MENU_TRIGGER,
} from '../../../../src/plugins/embeddable/public';
import { ExploreDataContextMenuAction, ACTION_EXPLORE_DATA } from './actions';

declare module '../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_EXPLORE_DATA]: EmbeddableContext;
  }
}

export interface DiscoverEnhancedSetupDependencies {
  embeddable: EmbeddableSetup;
  discover?: DiscoverSetup;
  uiActions: UiActionsSetup;
}

export interface DiscoverEnhancedStartDependencies {
  embeddable: EmbeddableStart;
  discover?: DiscoverStart;
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
      const exploreDataAction = new ExploreDataContextMenuAction({ start });
      uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, exploreDataAction);
    }
  }

  start(core: CoreStart, plugins: DiscoverEnhancedStartDependencies) {}

  stop() {}
}
