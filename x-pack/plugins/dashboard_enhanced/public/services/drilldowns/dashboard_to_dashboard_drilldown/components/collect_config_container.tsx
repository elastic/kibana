/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { debounce, findIndex } from 'lodash';
import { SimpleSavedObject } from '../../../../../../../../src/core/public';
import { DashboardDrilldownConfig } from './dashboard_drilldown_config';
import { txtDestinationDashboardNotFound } from './i18n';
import { CollectConfigProps } from '../../../../../../../../src/plugins/kibana_utils/public';
import { Config } from '../types';
import { Params } from '../drilldown';

const mergeDashboards = (
  dashboards: Array<EuiComboBoxOptionOption<string>>,
  selectedDashboard?: EuiComboBoxOptionOption<string>
) => {
  // if we have a selected dashboard and its not in the list, append it
  if (selectedDashboard && findIndex(dashboards, { value: selectedDashboard.value }) === -1) {
    return [selectedDashboard, ...dashboards];
  }
  return dashboards;
};

const dashboardSavedObjectToMenuItem = (
  savedObject: SimpleSavedObject<{
    title: string;
  }>
) => ({
  value: savedObject.id,
  label: savedObject.attributes.title,
});

interface DashboardDrilldownCollectConfigProps extends CollectConfigProps<Config> {
  params: Params;
}

interface CollectConfigContainerState {
  dashboards: Array<EuiComboBoxOptionOption<string>>;
  searchString?: string;
  isLoading: boolean;
  selectedDashboard?: EuiComboBoxOptionOption<string>;
  error?: string;
}

export class CollectConfigContainer extends React.Component<
  DashboardDrilldownCollectConfigProps,
  CollectConfigContainerState
> {
  private isMounted = true;
  state = {
    dashboards: [],
    isLoading: false,
    searchString: undefined,
    selectedDashboard: undefined,
    error: undefined,
  };

  constructor(props: DashboardDrilldownCollectConfigProps) {
    super(props);
    this.debouncedLoadDashboards = debounce(this.loadDashboards.bind(this), 500);
  }

  componentDidMount() {
    this.loadSelectedDashboard();
    this.loadDashboards();
  }

  componentWillUnmount() {
    this.isMounted = false;
  }

  render() {
    const { config, onConfig } = this.props;
    const { dashboards, selectedDashboard, isLoading, error } = this.state;

    return (
      <DashboardDrilldownConfig
        activeDashboardId={config.dashboardId}
        dashboards={mergeDashboards(dashboards, selectedDashboard)}
        currentFilters={config.useCurrentFilters}
        keepRange={config.useCurrentDateRange}
        isLoading={isLoading}
        error={error}
        onDashboardSelect={(dashboardId) => {
          onConfig({ ...config, dashboardId });
          if (this.state.error) {
            this.setState({ error: undefined });
          }
        }}
        onSearchChange={this.debouncedLoadDashboards}
        onCurrentFiltersToggle={() =>
          onConfig({
            ...config,
            useCurrentFilters: !config.useCurrentFilters,
          })
        }
        onKeepRangeToggle={() =>
          onConfig({
            ...config,
            useCurrentDateRange: !config.useCurrentDateRange,
          })
        }
      />
    );
  }

  private async loadSelectedDashboard() {
    const {
      config,
      params: { start },
    } = this.props;
    if (!config.dashboardId) return;
    const savedObject = await start().core.savedObjects.client.get<{ title: string }>(
      'dashboard',
      config.dashboardId
    );

    if (!this.isMounted) return;

    // handle case when destination dashboard no longer exists
    if (savedObject.error?.statusCode === 404) {
      this.setState({
        error: txtDestinationDashboardNotFound(config.dashboardId),
      });
      this.props.onConfig({ ...config, dashboardId: undefined });
      return;
    }

    if (savedObject.error) {
      this.setState({
        error: savedObject.error.message,
      });
      this.props.onConfig({ ...config, dashboardId: undefined });
      return;
    }

    this.setState({ selectedDashboard: dashboardSavedObjectToMenuItem(savedObject) });
  }

  private readonly debouncedLoadDashboards: (searchString?: string) => void;
  private async loadDashboards(searchString?: string) {
    this.setState({ searchString, isLoading: true });
    const savedObjectsClient = this.props.params.start().core.savedObjects.client;
    const { savedObjects } = await savedObjectsClient.find<{ title: string }>({
      type: 'dashboard',
      search: searchString ? `${searchString}*` : undefined,
      searchFields: ['title^3', 'description'],
      defaultSearchOperator: 'AND',
      perPage: 100,
    });

    // bail out if this response is no longer needed
    if (!this.isMounted) return;
    if (searchString !== this.state.searchString) return;

    const dashboardList = savedObjects.map(dashboardSavedObjectToMenuItem);

    this.setState({ dashboards: dashboardList, isLoading: false });
  }
}
