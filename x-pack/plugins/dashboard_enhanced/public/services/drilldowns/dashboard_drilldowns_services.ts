/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { SetupDependencies, StartDependencies } from '../../plugin';
import { CONTEXT_MENU_TRIGGER } from '../../../../../../src/plugins/embeddable/public';
import { EnhancedEmbeddableContext } from '../../../../embeddable_enhanced/public';
import {
  FlyoutCreateDrilldownAction,
  FlyoutEditDrilldownAction,
  OPEN_FLYOUT_ADD_DRILLDOWN,
  OPEN_FLYOUT_EDIT_DRILLDOWN,
} from './actions';

import { DashboardToDashboardDrilldown } from './dashboard_to_dashboard_drilldown';
import { createStartServicesGetter } from '../../../../../../src/plugins/kibana_utils/public';

declare module '../../../../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [OPEN_FLYOUT_ADD_DRILLDOWN]: EnhancedEmbeddableContext;
    [OPEN_FLYOUT_EDIT_DRILLDOWN]: EnhancedEmbeddableContext;
  }
}

interface BootstrapParams {
  enableDrilldowns: boolean;
}

export class DashboardDrilldownsService {
  bootstrap(
    core: CoreSetup<StartDependencies>,
    plugins: SetupDependencies,
    { enableDrilldowns }: BootstrapParams
  ) {
    if (enableDrilldowns) {
      this.setupDrilldowns(core, plugins);
    }
  }

  setupDrilldowns(core: CoreSetup<StartDependencies>, plugins: SetupDependencies) {
    const getStartServices = createStartServicesGetter<StartDependencies, unknown>(
      core.getStartServices
    );

    const overlays = () => getStartServices().core.overlays;
    const drilldowns = () => getStartServices().plugins.drilldowns;
    const getSavedObjectsClient = () => getStartServices().core.savedObjects.client;
    const getApplicationService = () => getStartServices().core.application;
    const getGetUrlGenerator = () => getStartServices().plugins.share.urlGenerators.getUrlGenerator;
    const getDataPluginActions = () => getStartServices().plugins.data.actions;

    const actionFlyoutCreateDrilldown = new FlyoutCreateDrilldownAction({ overlays, drilldowns });
    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, actionFlyoutCreateDrilldown);

    const actionFlyoutEditDrilldown = new FlyoutEditDrilldownAction({ overlays, drilldowns });
    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, actionFlyoutEditDrilldown);

    const dashboardToDashboardDrilldown = new DashboardToDashboardDrilldown({
      getSavedObjectsClient,
      getGetUrlGenerator,
      getApplicationService,
      getDataPluginActions,
    });
    plugins.drilldowns.registerDrilldown(dashboardToDashboardDrilldown);
  }
}
