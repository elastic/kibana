/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, CoreSetup, Plugin } from 'src/core/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { AdvancedUiActionsSetup, AdvancedUiActionsStart } from '../../ui_actions_enhanced/public';
import { createFlyoutManageDrilldowns } from './components/connected_flyout_manage_drilldowns';
import { Storage } from '../../../../src/plugins/kibana_utils/public';

export interface SetupDependencies {
  uiActions: UiActionsSetup;
  uiActionsEnhanced: AdvancedUiActionsSetup;
}

export interface StartDependencies {
  uiActions: UiActionsStart;
  uiActionsEnhanced: AdvancedUiActionsStart;
}

// eslint-disable-next-line
export interface SetupContract {}

export interface StartContract {
  FlyoutManageDrilldowns: ReturnType<typeof createFlyoutManageDrilldowns>;
}

export class DrilldownsPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies> {
  public setup(core: CoreSetup, plugins: SetupDependencies): SetupContract {
    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    return {
      FlyoutManageDrilldowns: createFlyoutManageDrilldowns({
        uiActionsEnhanced: plugins.uiActionsEnhanced,
        storage: new Storage(localStorage),
        notifications: core.notifications,
      }),
    };
  }

  public stop() {}
}
