/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { SetupDependencies } from '../../plugin';
import { CONTEXT_MENU_DRILLDOWNS_TRIGGER } from '../../../../../../src/plugins/embeddable/public';
import {
  FlyoutCreateDrilldownAction,
  FlyoutCreateDrilldownActionContext,
  FlyoutEditDrilldownAction,
  FlyoutEditDrilldownActionContext,
  OPEN_FLYOUT_ADD_DRILLDOWN,
  OPEN_FLYOUT_EDIT_DRILLDOWN,
} from './actions';

declare module '../../../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [OPEN_FLYOUT_ADD_DRILLDOWN]: FlyoutCreateDrilldownActionContext;
    [OPEN_FLYOUT_EDIT_DRILLDOWN]: FlyoutEditDrilldownActionContext;
  }
}

export class DashboardDrilldownsService {
  bootstrap(core: CoreSetup, { uiActions }: Pick<SetupDependencies, 'uiActions'>) {
    const overlays = async () => (await core.getStartServices())[0].overlays;

    const actionFlyoutCreateDrilldown = new FlyoutCreateDrilldownAction({ overlays });
    uiActions.registerAction(actionFlyoutCreateDrilldown);
    uiActions.attachAction(CONTEXT_MENU_DRILLDOWNS_TRIGGER, actionFlyoutCreateDrilldown);

    const actionFlyoutEditDrilldown = new FlyoutEditDrilldownAction({ overlays });
    uiActions.registerAction(actionFlyoutEditDrilldown);
    uiActions.attachAction(CONTEXT_MENU_DRILLDOWNS_TRIGGER, actionFlyoutEditDrilldown);
  }
}
