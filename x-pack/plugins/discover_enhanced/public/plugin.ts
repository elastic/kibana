/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { PluginInitializerContext } from 'kibana/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { APPLY_FILTER_TRIGGER } from '../../../../src/plugins/data/public';
import { createStartServicesGetter } from '../../../../src/plugins/kibana_utils/public';
import { DiscoverSetup, DiscoverStart } from '../../../../src/plugins/discover/public';
import { SharePluginSetup, SharePluginStart } from '../../../../src/plugins/share/public';
import { KibanaLegacySetup, KibanaLegacyStart } from '../../../../src/plugins/kibana_legacy/public';
import {
  EmbeddableSetup,
  EmbeddableStart,
  CONTEXT_MENU_TRIGGER,
} from '../../../../src/plugins/embeddable/public';
import { ExploreDataContextMenuAction, ExploreDataChartAction } from './actions';
import { Config } from '../common';

export interface DiscoverEnhancedSetupDependencies {
  discover: DiscoverSetup;
  embeddable: EmbeddableSetup;
  kibanaLegacy?: KibanaLegacySetup;
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
}

export interface DiscoverEnhancedStartDependencies {
  discover: DiscoverStart;
  embeddable: EmbeddableStart;
  kibanaLegacy?: KibanaLegacyStart;
  share?: SharePluginStart;
  uiActions: UiActionsStart;
}

export class DiscoverEnhancedPlugin
  implements
    Plugin<void, void, DiscoverEnhancedSetupDependencies, DiscoverEnhancedStartDependencies> {
  public readonly config: Config;

  constructor(protected readonly context: PluginInitializerContext) {
    this.config = context.config.get<Config>();
  }

  setup(
    core: CoreSetup<DiscoverEnhancedStartDependencies>,
    { uiActions, share }: DiscoverEnhancedSetupDependencies
  ) {
    const start = createStartServicesGetter(core.getStartServices);
    const isSharePluginInstalled = !!share;

    if (isSharePluginInstalled) {
      const params = { start };

      if (this.config.actions.exploreDataInContextMenu.enabled) {
        const exploreDataAction = new ExploreDataContextMenuAction(params);
        uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, exploreDataAction);
      }

      if (this.config.actions.exploreDataInChart.enabled) {
        const exploreDataChartAction = new ExploreDataChartAction(params);
        uiActions.addTriggerAction(APPLY_FILTER_TRIGGER, exploreDataChartAction);
      }
    }
  }

  start(core: CoreStart, plugins: DiscoverEnhancedStartDependencies) {}

  stop() {}
}
