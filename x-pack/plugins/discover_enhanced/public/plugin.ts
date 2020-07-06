/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { PluginInitializerContext } from 'kibana/public';
import {
  UiActionsSetup,
  UiActionsStart,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '../../../../src/plugins/ui_actions/public';
import { createStartServicesGetter } from '../../../../src/plugins/kibana_utils/public';
import { DiscoverSetup, DiscoverStart } from '../../../../src/plugins/discover/public';
import { SharePluginSetup, SharePluginStart } from '../../../../src/plugins/share/public';
import {
  EmbeddableSetup,
  EmbeddableStart,
  EmbeddableContext,
  CONTEXT_MENU_TRIGGER,
} from '../../../../src/plugins/embeddable/public';
import {
  ExploreDataContextMenuAction,
  ExploreDataChartAction,
  ACTION_EXPLORE_DATA,
  ACTION_EXPLORE_DATA_CHART,
  ExploreDataChartActionContext,
} from './actions';

declare module '../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_EXPLORE_DATA]: EmbeddableContext;
    [ACTION_EXPLORE_DATA_CHART]: ExploreDataChartActionContext;
  }
}

export interface DiscoverEnhancedSetupDependencies {
  discover: DiscoverSetup;
  embeddable: EmbeddableSetup;
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
}

export interface DiscoverEnhancedStartDependencies {
  discover: DiscoverStart;
  embeddable: EmbeddableStart;
  share?: SharePluginStart;
  uiActions: UiActionsStart;
}

export class DiscoverEnhancedPlugin
  implements
    Plugin<void, void, DiscoverEnhancedSetupDependencies, DiscoverEnhancedStartDependencies> {
  public readonly config: { actions: { exploreDataInChart: { enabled: boolean } } };

  constructor(protected readonly context: PluginInitializerContext) {
    this.config = context.config.get();
  }

  setup(
    core: CoreSetup<DiscoverEnhancedStartDependencies>,
    { uiActions, share }: DiscoverEnhancedSetupDependencies
  ) {
    const start = createStartServicesGetter(core.getStartServices);
    const isSharePluginInstalled = !!share;

    if (isSharePluginInstalled) {
      const params = { start };

      const exploreDataAction = new ExploreDataContextMenuAction(params);
      uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, exploreDataAction);

      if (this.config.actions.exploreDataInChart.enabled) {
        const exploreDataChartAction = new ExploreDataChartAction(params);
        uiActions.addTriggerAction(SELECT_RANGE_TRIGGER, exploreDataChartAction);
        uiActions.addTriggerAction(VALUE_CLICK_TRIGGER, exploreDataChartAction);
      }
    }
  }

  start(core: CoreStart, plugins: DiscoverEnhancedStartDependencies) {}

  stop() {}
}
