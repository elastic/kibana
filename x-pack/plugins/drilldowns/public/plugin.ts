/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, PluginInitializerContext, CoreSetup, Plugin } from 'src/core/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';

export interface DrilldownsSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface DrilldownsStartDependencies {
  uiActiosn: UiActionsStart;
}

export interface DrilldownsSetupContract {
  registerDrilldown: () => void;
}
// eslint-disable-next-line
export interface DrilldownsStartContract {}

export class DrilldownsPlugin
  implements
    Plugin<
      DrilldownsSetupContract,
      DrilldownsStartContract,
      DrilldownsSetupDependencies,
      DrilldownsStartDependencies
    > {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: DrilldownsSetupDependencies): DrilldownsSetupContract {
    return {
      registerDrilldown: () => {
        throw new Error('not implemented');
      },
    };
  }

  public start(core: CoreStart, plugins: DrilldownsStartDependencies): DrilldownsStartContract {
    return {};
  }

  public stop() {}
}
