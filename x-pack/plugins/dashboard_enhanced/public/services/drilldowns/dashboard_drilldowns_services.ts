/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { SetupDependencies, StartDependencies } from '../../plugin';
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
import { DashboardToDashboardDrilldown } from './dashboard_to_dashboard_drilldown';

declare module '../../../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [OPEN_FLYOUT_ADD_DRILLDOWN]: EmbeddableContext;
    [OPEN_FLYOUT_EDIT_DRILLDOWN]: EmbeddableContext;
  }
}

export class DashboardDrilldownsService {
  async bootstrap(core: CoreSetup<StartDependencies>, plugins: SetupDependencies) {
    const overlays = async () => (await core.getStartServices())[0].overlays;
    const drilldowns = async () => (await core.getStartServices())[1].drilldowns;
    const getSavedObjectsClient = async () =>
      (await core.getStartServices())[0].savedObjects.client;
    const getNavigateToApp = async () =>
      (await core.getStartServices())[0].application.navigateToApp;

    const getGetUrlGenerator = async () =>
      (await core.getStartServices())[1].share.urlGenerators.getUrlGenerator;

    const actionFlyoutCreateDrilldown = new FlyoutCreateDrilldownAction({ overlays, drilldowns });
    plugins.uiActions.registerAction(actionFlyoutCreateDrilldown);
    plugins.uiActions.attachAction(CONTEXT_MENU_TRIGGER, actionFlyoutCreateDrilldown);

    const actionFlyoutEditDrilldown = new FlyoutEditDrilldownAction({ overlays, drilldowns });
    plugins.uiActions.registerAction(actionFlyoutEditDrilldown);
    plugins.uiActions.attachAction(CONTEXT_MENU_TRIGGER, actionFlyoutEditDrilldown);

    const dashboardToDashboardDrilldown = new DashboardToDashboardDrilldown({
      getSavedObjectsClient,
      getGetUrlGenerator,
      getNavigateToApp,
    });
    plugins.drilldowns.registerDrilldown(dashboardToDashboardDrilldown);
  }
}
