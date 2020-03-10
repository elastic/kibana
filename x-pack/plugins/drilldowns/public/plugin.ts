/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, CoreSetup, Plugin } from 'src/core/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { DrilldownService } from './service';
import {
  FlyoutCreateDrilldownActionContext,
  FlyoutEditDrilldownActionContext,
  OPEN_FLYOUT_ADD_DRILLDOWN,
  OPEN_FLYOUT_EDIT_DRILLDOWN,
} from './actions';

export interface DrilldownsSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface DrilldownsStartDependencies {
  uiActions: UiActionsStart;
}

export type DrilldownsSetupContract = Pick<DrilldownService, 'registerDrilldown'>;

// eslint-disable-next-line
export interface DrilldownsStartContract {}

declare module '../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [OPEN_FLYOUT_ADD_DRILLDOWN]: FlyoutCreateDrilldownActionContext;
    [OPEN_FLYOUT_EDIT_DRILLDOWN]: FlyoutEditDrilldownActionContext;
  }
}

export class DrilldownsPlugin
  implements
    Plugin<
      DrilldownsSetupContract,
      DrilldownsStartContract,
      DrilldownsSetupDependencies,
      DrilldownsStartDependencies
    > {
  private readonly service = new DrilldownService();

  public setup(core: CoreSetup, plugins: DrilldownsSetupDependencies): DrilldownsSetupContract {
    this.service.bootstrap(core, plugins);

    return this.service;
  }

  public start(core: CoreStart, plugins: DrilldownsStartDependencies): DrilldownsStartContract {
    return {};
  }

  public stop() {}
}
