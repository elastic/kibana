/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'src/core/public';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';
import { FactoryContext, ActionContext, Config } from './types';
import { CollectConfig } from './collect_config';
import { DASHBOARD_TO_DASHBOARD_DRILLDOWN } from './constants';
import { DrilldownsDrilldown as Drilldown } from '../../../../../drilldowns/public';
import { txtGoToDashboard } from './i18n';

export const dashboards = [
  { id: 'dashboard1', title: 'Dashboard 1' },
  { id: 'dashboard2', title: 'Dashboard 2' },
];

export interface Params {
  savedObjects: () => Promise<CoreStart['savedObjects']['client']>;
}

export class DashboardToDashboardDrilldown
  implements Drilldown<Config, FactoryContext, ActionContext> {
  constructor(protected readonly params: Params) {}

  public readonly id = DASHBOARD_TO_DASHBOARD_DRILLDOWN;

  public readonly order = 5;

  public readonly getDisplayName = () => txtGoToDashboard;

  public readonly getIconType = () => 'dashboardApp';

  public readonly CollectConfig = reactToUiComponent(CollectConfig);

  public readonly createConfig = () => ({
    dashboardId: '123',
    useCurrentDashboardDataRange: true,
    useCurrentDashboardFilters: true,
  });

  public readonly isConfigValid = (config: Config) => {
    if (!config.dashboardId) return false;
    return true;
  };

  public readonly execute = () => {
    alert('Go to another drilldown!');
  };
}
