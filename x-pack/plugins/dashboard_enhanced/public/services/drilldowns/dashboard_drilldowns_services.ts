/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { SetupDependencies } from '../../plugin';
import {
  CONTEXT_MENU_DRILLDOWNS_TRIGGER,
  EmbeddableContext,
} from '../../../../../../src/plugins/embeddable/public';
import {
  FlyoutCreateDrilldownAction,
  FlyoutCreateDrilldownActionContext,
  FlyoutEditDrilldownAction,
  OPEN_FLYOUT_ADD_DRILLDOWN,
  OPEN_FLYOUT_EDIT_DRILLDOWN,
} from './actions';
import { DrilldownsStartContract } from '../../../../drilldowns/public';

declare module '../../../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [OPEN_FLYOUT_ADD_DRILLDOWN]: FlyoutCreateDrilldownActionContext;
    [OPEN_FLYOUT_EDIT_DRILLDOWN]: EmbeddableContext;
  }
}

export class DashboardDrilldownsService {
  bootstrap(
    core: CoreSetup<{ drilldowns: DrilldownsStartContract }>,
    { uiActions }: Pick<SetupDependencies, 'uiActions'>
  ) {
    const overlays = async () => (await core.getStartServices())[0].overlays;
    const drilldowns = async () => (await core.getStartServices())[1].drilldowns;

    const actionFlyoutCreateDrilldown = new FlyoutCreateDrilldownAction({ overlays, drilldowns });
    uiActions.registerAction(actionFlyoutCreateDrilldown);
    uiActions.attachAction(CONTEXT_MENU_DRILLDOWNS_TRIGGER, actionFlyoutCreateDrilldown);

    const actionFlyoutEditDrilldown = new FlyoutEditDrilldownAction({ overlays, drilldowns });
    uiActions.registerAction(actionFlyoutEditDrilldown);
    uiActions.attachAction(CONTEXT_MENU_DRILLDOWNS_TRIGGER, actionFlyoutEditDrilldown);
  }
}
