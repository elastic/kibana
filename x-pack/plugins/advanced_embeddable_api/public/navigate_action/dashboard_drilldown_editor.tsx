/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText, EuiForm, EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import React, { Component } from 'react';
import chrome from 'ui/chrome';
import { getUpdatedConfiguration, ParsedConfig } from './dashboard_drilldown_action';

interface Props {
  config: string;
  onChange: (config: string) => void;
}

interface State {
  dashboardOptions: Array<{ text: string; value: string }>;
}

export class DashboardDrilldownEditor extends Component<Props, State> {
  private parsedConfig: ParsedConfig;
  constructor(props: Props) {
    super(props);

    this.state = {
      dashboardOptions: [],
    };
  }

  public async componentDidMount() {
    const savedObjectClient = chrome.getSavedObjectsClient();
    const response = await savedObjectClient.find({ type: 'dashboard' });
    const dashboardOptions: Array<{ text: string; value: string }> = [];
    response.savedObjects.forEach(dashboard => {
      dashboardOptions.push({ text: dashboard.attributes.title, value: dashboard.id });
    });
    this.setState({ dashboardOptions });
  }

  public render() {
    const {
      dashboardId,
      addDynamicFilters,
      staticQuery,
      useDynamicTimeRange,
      inNewTab,
      staticTimeRange,
    } = JSON.parse(this.props.config);
    return (
      <EuiForm>
        <EuiFormRow label="Dashboard">
          <EuiSelect
            options={this.state.dashboardOptions}
            value={dashboardId}
            onChange={this.changeDashboard}
          />
        </EuiFormRow>

        <EuiFormRow label="Apply a static query">
          <EuiFieldText name="Static Query" onChange={this.setStaticQuery} value={staticQuery} />
        </EuiFormRow>

        <EuiFormRow label="Use dynamic filters from trigger">
          <EuiSwitch
            name="Use dynamic filters"
            label="Use dynamic filters"
            checked={addDynamicFilters}
            onChange={() => this.toggleAddDynamicFilters(addDynamicFilters)}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }

  private toggleAddDynamicFilters = (currentValue: boolean) => {
    this.props.onChange(
      getUpdatedConfiguration(this.props.config, { addDynamicFilters: !currentValue })
    );
  };

  private changeDashboard = (e: any) => {
    this.props.onChange(
      getUpdatedConfiguration(this.props.config, { dashboardId: e.target.value })
    );
  };

  private setStaticQuery = (e: any) => {
    this.props.onChange(
      getUpdatedConfiguration(this.props.config, { staticQuery: e.target.value })
    );
  };
}
