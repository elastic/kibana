/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, CoreSetup, Plugin } from 'src/core/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { AdvancedUiActionsSetup, AdvancedUiActionsStart } from '../../advanced_ui_actions/public';
import { DrilldownService, DrilldownServiceSetupContract } from './services';
import { createFlyoutManageDrilldowns } from './components/connected_flyout_manage_drilldowns';
import { Storage } from '../../../../src/plugins/kibana_utils/public';

export interface SetupDependencies {
  uiActions: UiActionsSetup;
  advancedUiActions: AdvancedUiActionsSetup;
}

export interface StartDependencies {
  uiActions: UiActionsStart;
  advancedUiActions: AdvancedUiActionsStart;
}

export type SetupContract = DrilldownServiceSetupContract;

// eslint-disable-next-line
export interface StartContract {
  FlyoutManageDrilldowns: ReturnType<typeof createFlyoutManageDrilldowns>;
}

export class DrilldownsPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies> {
  private readonly service = new DrilldownService();

  public setup(core: CoreSetup, plugins: SetupDependencies): SetupContract {
    const setup = this.service.setup(core, plugins);

    return setup;
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    return {
      FlyoutManageDrilldowns: createFlyoutManageDrilldowns({
        advancedUiActions: plugins.advancedUiActions,
        storage: new Storage(localStorage),
      }),
    };
  }

  public stop() {}
}
