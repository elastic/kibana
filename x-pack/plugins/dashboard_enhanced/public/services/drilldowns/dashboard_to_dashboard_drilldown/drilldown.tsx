/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreStart } from 'src/core/public';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';
import { FactoryContext, ActionContext, Config, CollectConfigProps } from './types';
import { CollectConfigContainer } from './collect_config';
import { DASHBOARD_TO_DASHBOARD_DRILLDOWN } from './constants';
import { DrilldownsDrilldown as Drilldown } from '../../../../../drilldowns/public';
import { txtGoToDashboard } from './i18n';

export interface Params {
  getSavedObjectsClient: () => Promise<CoreStart['savedObjects']['client']>;
  getNavigateToApp: () => Promise<CoreStart['application']['navigateToApp']>;
}

export class DashboardToDashboardDrilldown
  implements Drilldown<Config, FactoryContext, ActionContext> {
  constructor(protected readonly params: Params) {}

  // TODO: public readonly places = ['dashboard'];

  public readonly id = DASHBOARD_TO_DASHBOARD_DRILLDOWN;

  public readonly order = 100;

  public readonly getDisplayName = () => txtGoToDashboard;

  public readonly euiIcon = 'dashboardApp';

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = props => (
    <CollectConfigContainer {...props} params={this.params} />
  );

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    dashboardId: '',
    useCurrentDashboardDataRange: true,
    useCurrentDashboardFilters: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (!config.dashboardId) return false;
    return true;
  };

  // it seems like this fn is being execute with the wrong arguments
  // first param should be Config but its { config: Config; name: string; actionFactory: string; } ( I thtink )

  // @ts-ignore
  public readonly execute = async ({ config }: Config, context: ActionContext) => {
    // todo - need to complete this
    await this.params.getNavigateToApp().then(navigateToApp => {
      navigateToApp('kibana', { path: `#/dashboard/${config.dashboardId}` });
    });
    // window.location.hash = `#/dashboard/${config.dashboardId}`;
  };
}
