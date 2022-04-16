/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { SetupDependencies, StartDependencies } from '../../plugin';
import { FlyoutCreateDrilldownAction, FlyoutEditDrilldownAction } from './actions';
import { EmbeddableToDashboardDrilldown } from './embeddable_to_dashboard_drilldown';

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

  setupDrilldowns(
    core: CoreSetup<StartDependencies>,
    { uiActionsEnhanced: uiActions }: SetupDependencies
  ) {
    const start = createStartServicesGetter(core.getStartServices);

    const actionFlyoutCreateDrilldown = new FlyoutCreateDrilldownAction({ start });
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, actionFlyoutCreateDrilldown);

    const actionFlyoutEditDrilldown = new FlyoutEditDrilldownAction({ start });
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, actionFlyoutEditDrilldown);

    const dashboardToDashboardDrilldown = new EmbeddableToDashboardDrilldown({ start });
    uiActions.registerDrilldown(dashboardToDashboardDrilldown);
  }
}
