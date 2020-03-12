/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import { AdvancedUiActionsActionFactoryDefinition } from '../../../../../advanced_ui_actions/public';
import {
  // UiActionsActionDefinition,
  UiActionsCollectConfigProps,
} from '../../../../../../../src/plugins/ui_actions/public';
import { reactToUiComponent } from '../../../../../../../src/plugins/kibana_react/public';

/*
import {
  SavedObjectLoader,
  SavedObjectKibanaServices,
} from '../../../../../../../src/plugins/saved_objects/public';
*/

export const dashboards = [
  { id: 'dashboard1', title: 'Dashboard 1' },
  { id: 'dashboard2', title: 'Dashboard 2' },
];

// todo load list of dashboards
/*
const DashboardDrilldownCollectConfig = (dashboardLoader: SavedObjectLoader) => (
  props: UiActionsCollectConfigProps<DashboardDrilldownConfig>
) => {
  console.log('DashboardDrilldownCollectConfig');
  dashboardLoader.find().then(item => console.log('HERE HERE', item));
  */
const DashboardDrilldownCollectConfig = (
  props: UiActionsCollectConfigProps<DashboardDrilldownConfig>
) => {
  const config = props.config ?? {
    dashboardId: undefined,
    useCurrentDashboardDataRange: true,
    useCurrentDashboardFilters: true,
  };
  return (
    <>
      <EuiFormRow label="Choose destination dashboard:">
        <EuiSelect
          name="selectDashboard"
          hasNoInitialSelection={true}
          options={dashboards.map(({ id, title }) => ({ value: id, text: title }))}
          value={config.dashboardId}
          onChange={e => {
            props.onConfig({ ...config, dashboardId: e.target.value });
          }}
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          name="useCurrentFilters"
          label="Use current dashboard's filters"
          checked={config.useCurrentDashboardFilters}
          onChange={() =>
            props.onConfig({
              ...config,
              useCurrentDashboardFilters: !config.useCurrentDashboardFilters,
            })
          }
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          name="useCurrentDateRange"
          label="Use current dashboard's date range"
          checked={config.useCurrentDashboardDataRange}
          onChange={() =>
            props.onConfig({
              ...config,
              useCurrentDashboardDataRange: !config.useCurrentDashboardDataRange,
            })
          }
        />
      </EuiFormRow>
    </>
  );
};

interface DashboardDrilldownConfig {
  dashboardId?: string;
  useCurrentDashboardFilters: boolean;
  useCurrentDashboardDataRange: boolean;
}

/*
export function createSavedDashboardLoader(services: SavedObjectKibanaServices) {
  const SavedDashboard = createSavedDashboardClass(services);
  return new SavedObjectLoader(SavedDashboard, services.savedObjectsClient, services.chrome);
}


export const DashboardDrilldownActionFactory = (
  services: SavedObjectKibanaServices
):
*/

interface DashboardDrilldownActionContext {
  embeddable: string;
  timeFieldName: string;
  data: any;
}

export const DashboardDrilldownActionFactory: AdvancedUiActionsActionFactoryDefinition<
  DashboardDrilldownConfig, // config
  any, // FactoryConfig
  any // ActionContext
> = {
  id: 'dashboardDrilldown',
  getDisplayName: () => 'Go to Dashboard',
  getIconType: () => 'dashboardApp',
  // create(): UiActionsActionDefinition<DashboardDrilldownConfig> {
  create() {
    return {
      id: 'drilldown',
      order: 1,
      async execute(thing: DashboardDrilldownActionContext) {
        alert('Go to another drilldown');
      },
    };
  },
  createConfig() {
    // console.log('createConfig');
    return {
      dashboardId: '123',
      useCurrentDashboardDataRange: true,
      useCurrentDashboardFilters: true,
    };
  },
  isConfigValid(config: DashboardDrilldownConfig) {
    if (!config.dashboardId) return false;
    return true;
  },
  CollectConfig: reactToUiComponent(DashboardDrilldownCollectConfig),
  // CollectConfig: reactToUiComponent(DashboardDrilldownCollectConfig(dashboardLoader)),
  order: 5,
  isCompatible(context?: object): Promise<boolean> {
    return Promise.resolve(true);
  },
};
