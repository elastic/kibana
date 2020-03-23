/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { debounce, findIndex } from 'lodash';
import { CollectConfigProps } from './types';
import { DashboardDrilldownConfig } from '../../../components/dashboard_drilldown_config';
import { SimpleSavedObject } from '../../../../../../../src/core/public';

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

interface CollectConfigContainerState {
  dashboards: Array<EuiComboBoxOptionOption<string>>;
  searchString?: string;
  isLoading: boolean;
  selectedDashboard?: EuiComboBoxOptionOption<string>;
  delay: boolean;
}

export class CollectConfigContainer extends React.Component<
  CollectConfigProps,
  CollectConfigContainerState
> {
  private isMounted = true;
  state = {
    dashboards: [],
    isLoading: false,
    searchString: undefined,
    selectedDashboard: undefined,
    delay: false,
  };

  constructor(props: CollectConfigProps) {
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

  loadSelectedDashboard() {
    const { config } = this.props;
    this.props.deps.getSavedObjectsClient().then(savedObjectsClient => {
      if (config.dashboardId) {
        savedObjectsClient
          .get<{ title: string }>('dashboard', config.dashboardId)
          .then(dashboard => {
            if (!this.isMounted) return;
            this.setState({ selectedDashboard: dashboardSavedObjectToMenuItem(dashboard) });
          });
      }
    });
  }

  private readonly debouncedLoadDashboards: (searchString?: string) => void;
  loadDashboards(searchString?: string) {
    const currentDashboardId = this.props.context.placeContext.embeddable?.parent?.id;
    this.setState({ searchString, isLoading: true });
    this.props.deps.getSavedObjectsClient().then(savedObjectsClient => {
      savedObjectsClient
        .find<{ title: string }>({
          type: 'dashboard',
          search: searchString ? `${searchString}*` : undefined,
          searchFields: ['title^3', 'description'],
          defaultSearchOperator: 'AND',
          perPage: 100,
        })
        .then(({ savedObjects }) => {
          if (!this.isMounted) return;
          if (searchString !== this.state.searchString) return;
          const dashboardList = savedObjects
            .map(dashboardSavedObjectToMenuItem)
            .filter(({ value }) => !currentDashboardId || value !== currentDashboardId);
          this.setState({ dashboards: dashboardList, isLoading: false });
        });
    });
  }

  render() {
    const { config, onConfig } = this.props;
    const { dashboards, selectedDashboard, isLoading } = this.state;

    return (
      <DashboardDrilldownConfig
        activeDashboardId={config.dashboardId}
        dashboards={mergeDashboards(dashboards, selectedDashboard)}
        currentFilters={config.useCurrentFilters}
        keepRange={config.useCurrentDateRange}
        isLoading={isLoading}
        onDashboardSelect={dashboardId => {
          onConfig({ ...config, dashboardId });
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
}
