/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { AdvancedUiActionsSetup, AdvancedUiActionsStart } from '../../ui_actions_enhanced/server';
import { EMBEDDABLE_TO_DASHBOARD_DRILLDOWN, createExtract, createInject } from '../common';

export interface SetupDependencies {
  uiActionsEnhanced: AdvancedUiActionsSetup;
}

export interface StartDependencies {
  uiActionsEnhanced: AdvancedUiActionsStart;
}

// eslint-disable-next-line
export interface SetupContract {}

// eslint-disable-next-line
export interface StartContract {}

export class DashboardEnhancedPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies> {
  constructor(protected readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    plugins.uiActionsEnhanced.registerActionFactory({
      id: EMBEDDABLE_TO_DASHBOARD_DRILLDOWN,
      inject: createInject({ drilldownId: EMBEDDABLE_TO_DASHBOARD_DRILLDOWN }),
      extract: createExtract({ drilldownId: EMBEDDABLE_TO_DASHBOARD_DRILLDOWN }),
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    return {};
  }

  public stop() {}
}
