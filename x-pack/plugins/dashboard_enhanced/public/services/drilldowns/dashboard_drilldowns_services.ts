/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { SetupDependencies } from '../../plugin';
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddableContext,
} from '../../../../../../src/plugins/embeddable/public';
import {
  FlyoutCreateDrilldownAction,
  FlyoutEditDrilldownAction,
  OPEN_FLYOUT_ADD_DRILLDOWN,
  OPEN_FLYOUT_EDIT_DRILLDOWN,
} from './actions';
import { DrilldownsStartContract } from '../../../../drilldowns/public';
import { DashboardToDashboardDrilldown } from './dashboard_to_dashboard_drilldown';

declare module '../../../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [OPEN_FLYOUT_ADD_DRILLDOWN]: EmbeddableContext;
    [OPEN_FLYOUT_EDIT_DRILLDOWN]: EmbeddableContext;
  }
}

export class DashboardDrilldownsService {
  async bootstrap(
    core: CoreSetup<{ drilldowns: DrilldownsStartContract }>,
    plugins: SetupDependencies
  ) {
    const overlays = async () => (await core.getStartServices())[0].overlays;
    const drilldowns = async () => (await core.getStartServices())[1].drilldowns;
    const savedObjects = async () => (await core.getStartServices())[0].savedObjects.client;

    const actionFlyoutCreateDrilldown = new FlyoutCreateDrilldownAction({ overlays, drilldowns });
    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, actionFlyoutCreateDrilldown);

    const actionFlyoutEditDrilldown = new FlyoutEditDrilldownAction({ overlays, drilldowns });
    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, actionFlyoutEditDrilldown);

    const dashboardToDashboardDrilldown = new DashboardToDashboardDrilldown({
      savedObjects,
    });
    plugins.drilldowns.registerDrilldown(dashboardToDashboardDrilldown);
  }
}
