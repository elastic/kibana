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
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { SharePluginSetup, SharePluginStart } from '../../../../src/plugins/share/public';
import {
  EmbeddableSetup,
  EmbeddableStart,
  EmbeddableContext,
  CONTEXT_MENU_TRIGGER,
  RangeSelectTriggerContext,
  ValueClickTriggerContext,
} from '../../../../src/plugins/embeddable/public';
import {
  ViewInDiscoverContextMenuAction,
  ACTION_VIEW_IN_DISCOVER_CONTEXT_MENU,
  ViewInDiscoverFilterAction,
  ACTION_VIEW_IN_DISCOVER_FILTER,
} from './actions';

declare module '../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_VIEW_IN_DISCOVER_CONTEXT_MENU]: EmbeddableContext;
    [ACTION_VIEW_IN_DISCOVER_FILTER]: ValueClickTriggerContext | RangeSelectTriggerContext;
  }
}

export interface DiscoverEnhancedSetupDependencies {
  data: DataPublicPluginSetup;
  embeddable: EmbeddableSetup;
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
}

export interface DiscoverEnhancedStartDependencies {
  data: DataPublicPluginStart;
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
      const viewInDiscoverContextMenuAction = new ViewInDiscoverContextMenuAction({ start });
      uiActions.attachAction(CONTEXT_MENU_TRIGGER, viewInDiscoverContextMenuAction);

      const viewInDiscoverFilterAction = new ViewInDiscoverFilterAction({ start });
      uiActions.attachAction(SELECT_RANGE_TRIGGER, viewInDiscoverFilterAction);
      uiActions.attachAction(VALUE_CLICK_TRIGGER, viewInDiscoverFilterAction);
    }
  }

  start(core: CoreStart, plugins: DiscoverEnhancedStartDependencies) {}

  stop() {}
}
