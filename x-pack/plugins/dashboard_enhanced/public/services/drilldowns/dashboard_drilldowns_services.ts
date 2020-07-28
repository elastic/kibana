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

  setupDrilldowns(
    core: CoreSetup<StartDependencies>,
    { uiActionsEnhanced: uiActions }: SetupDependencies
  ) {
    const start = createStartServicesGetter(core.getStartServices);
    const getDashboardUrlGenerator = () => {
      const urlGenerator = start().plugins.dashboard.dashboardUrlGenerator;
      if (!urlGenerator)
        throw new Error('dashboardUrlGenerator is required for dashboard to dashboard drilldown');
      return urlGenerator;
    };

    const actionFlyoutCreateDrilldown = new FlyoutCreateDrilldownAction({ start });
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, actionFlyoutCreateDrilldown);

    const actionFlyoutEditDrilldown = new FlyoutEditDrilldownAction({ start });
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, actionFlyoutEditDrilldown);

    const dashboardToDashboardDrilldown = new DashboardToDashboardDrilldown({
      start,
      getDashboardUrlGenerator,
    });
    uiActions.registerDrilldown(dashboardToDashboardDrilldown);
  }
}
