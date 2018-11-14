/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import React, { Fragment } from 'react';

import {
  // @ts-ignore
  EuiAccordion,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import chrome from 'ui/chrome';

import { EnrichedDeprecationInfo } from '../../../../server/lib/es_migration_apis';
import { CheckupControls } from './controls';
import { GroupedDeprecations } from './deprecations';
import { GroupByOption, LevelFilterOption, LoadingState } from './types';

type CHECKUP_TYPE = 'cluster' | 'nodes' | 'indices';

interface CheckupTabProps {
  checkupType: CHECKUP_TYPE;
}

interface CheckupTabState {
  loadingState: LoadingState;
  deprecations?: EnrichedDeprecationInfo[];
  currentFilter: Set<LevelFilterOption>;
  currentGroupBy: GroupByOption;
}

export class CheckupTab extends React.Component<CheckupTabProps, CheckupTabState> {
  constructor(props: CheckupTabProps) {
    super(props);

    this.state = {
      loadingState: LoadingState.Loading,
      // initialize to all filters
      currentFilter: new Set([LevelFilterOption.warning, LevelFilterOption.critical]),
      currentGroupBy: GroupByOption.message,
    };
  }

  public componentWillMount() {
    return this.loadData();
  }

  public render() {
    const { checkupType } = this.props;
    const { currentFilter, currentGroupBy, loadingState } = this.state;

    return (
      <Fragment>
        <EuiSpacer />
        <EuiTitle>
          <h3 style={{ textTransform: 'capitalize' }}>{checkupType} Checkup</h3>
        </EuiTitle>
        <EuiSpacer />
        <EuiText>
          <p>
            This tool runs a series of checks against your Elasticsearch {checkupType} to determine
            whether you can upgrade directly to Elasticsearch 7.0, or whether you need to make
            changes to your data before doing so.
          </p>
        </EuiText>
        <EuiSpacer />
        <CheckupControls
          loadingState={loadingState}
          loadData={this.loadData}
          currentFilter={currentFilter}
          onFilterChange={this.changeFilter}
          availableGroupByOptions={this.availableGroupByOptions()}
          currentGroupBy={currentGroupBy}
          onGroupByChange={this.changeGroupBy}
        />
        <EuiSpacer />
        {this.renderCheckupData()}
      </Fragment>
    );
  }

  private loadData = async () => {
    try {
      this.setState({ loadingState: LoadingState.Loading });
      const resp = await axios.get(chrome.addBasePath('/api/upgrade_checkup/status'));
      this.setState({
        loadingState: LoadingState.Success,
        deprecations: resp.data.new_data[this.props.checkupType],
      });
    } catch (e) {
      // TODO: show error message?
      this.setState({ loadingState: LoadingState.Error });
    }
  };

  private changeFilter = (filter: LevelFilterOption) => {
    // Make a copy so we don't modify the current one being rendered.
    const newFilters = new Set(this.state.currentFilter);

    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }

    this.setState({ currentFilter: newFilters });
  };

  private changeGroupBy = (groupBy: GroupByOption) => {
    this.setState({ currentGroupBy: groupBy });
  };

  private availableGroupByOptions() {
    const { deprecations } = this.state;

    if (!deprecations) {
      return [];
    }

    return Object.keys(GroupByOption).filter(opt => _.find(deprecations, opt)) as GroupByOption[];
  }

  private renderCheckupData() {
    const { loadingState, deprecations, currentFilter, currentGroupBy } = this.state;

    if (loadingState === LoadingState.Error) {
      return (
        <EuiCallOut title="Sorry, there was an error" color="danger" iconType="cross">
          <p>There was a network error retrieving the checkup results.</p>
        </EuiCallOut>
      );
    }

    return (
      <div>
        <GroupedDeprecations
          currentGroupBy={currentGroupBy}
          currentFilter={currentFilter}
          deprecations={deprecations}
        />
      </div>
    );
  }
}
