/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { debounce, findIndex } from 'lodash';
import { CoreStart, SimpleSavedObject } from '../../../../../../../../src/core/public';
import { DashboardDrilldownConfig } from './dashboard_drilldown_config';
import { txtDestinationDashboardNotFound } from './i18n';
import { UiActionsCollectConfigProps } from '../../../../../../../../src/plugins/ui_actions/public';
import { DrilldownFactoryContext } from '../../../../../../drilldowns/public';
import { Config } from '../types';
import { IEmbeddable } from '../../../../../../../../src/plugins/embeddable/public';

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

interface CollectConfigProps extends UiActionsCollectConfigProps<Config> {
  deps: {
    getSavedObjectsClient: () => CoreStart['savedObjects']['client'];
  };
  context: DrilldownFactoryContext<{
    embeddable: IEmbeddable;
  }>;
}

interface CollectConfigContainerState {
  dashboards: Array<EuiComboBoxOptionOption<string>>;
  searchString?: string;
  isLoading: boolean;
  selectedDashboard?: EuiComboBoxOptionOption<string>;
  error: string | null;
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
    error: null,
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
        onDashboardSelect={dashboardId => {
          onConfig({ ...config, dashboardId });
          if (this.state.error) {
            this.setState({ error: null });
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
    const { config } = this.props;
    if (!config.dashboardId) return;
    const savedObjectsClient = this.props.deps.getSavedObjectsClient();
    const savedObject = await savedObjectsClient.get<{ title: string }>(
      'dashboard',
      config.dashboardId
    );

    if (!this.isMounted) return; // bailout if response is no longer needed

    // handle case when destination dashboard is no longer exist
    if (savedObject.error?.statusCode === 404) {
      this.setState({
        error: txtDestinationDashboardNotFound(config.dashboardId),
      });
      this.props.onConfig({ ...config, dashboardId: undefined });
      return;
    }

    // any other error
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
    const currentDashboardId = this.props.context.placeContext.embeddable?.parent?.id;
    this.setState({ searchString, isLoading: true });
    const savedObjectsClient = this.props.deps.getSavedObjectsClient();
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

    const dashboardList = savedObjects
      .map(dashboardSavedObjectToMenuItem)
      .filter(({ value }) => !currentDashboardId || value !== currentDashboardId);

    this.setState({ dashboards: dashboardList, isLoading: false });
  }
}
