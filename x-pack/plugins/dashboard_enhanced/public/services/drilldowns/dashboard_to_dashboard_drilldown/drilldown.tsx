/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreStart } from 'src/core/public';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';
import { PlaceContext, ActionContext, Config, CollectConfigProps } from './types';
import { CollectConfigContainer } from './collect_config';
import { DASHBOARD_TO_DASHBOARD_DRILLDOWN } from './constants';
import { DrilldownDefinition as Drilldown } from '../../../../../drilldowns/public';
import { txtGoToDashboard } from './i18n';

export interface Params {
  savedObjects: () => Promise<CoreStart['savedObjects']['client']>;
}

export class DashboardToDashboardDrilldown
  implements Drilldown<Config, PlaceContext, ActionContext> {
  constructor(protected readonly params: Params) {}

  public readonly id = DASHBOARD_TO_DASHBOARD_DRILLDOWN;

  public readonly order = 100;

  public readonly getDisplayName = () => txtGoToDashboard;

  public readonly euiIcon = 'dashboardApp';

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = props => (
    <CollectConfigContainer {...props} params={this.params} />
  );

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    dashboardId: '123',
    useCurrentFilters: true,
    useCurrentDateRange: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (!config.dashboardId) return false;
    return true;
  };

  public readonly execute = () => {
    alert('Go to another dashboard!');
  };
}
