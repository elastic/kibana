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
  EuiEmptyPrompt,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import chrome from 'ui/chrome';

import { DeprecationInfo } from 'src/core_plugins/elasticsearch';
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

const filterDeps = (levels: Set<LevelFilterOption>) => (dep: DeprecationInfo) => {
  return levels.has(dep.level as LevelFilterOption);
};

/**
 * Displays a list of deprecations that filterable and groupable. Can be used for cluster,
 * nodes, or indices checkups.
 */
export class CheckupTab extends React.Component<CheckupTabProps, CheckupTabState> {
  constructor(props: CheckupTabProps) {
    super(props);

    this.state = {
      loadingState: LoadingState.Loading,
      // initialize to all filters
      currentFilter: new Set([
        LevelFilterOption.info,
        LevelFilterOption.warning,
        LevelFilterOption.critical,
      ]),
      currentGroupBy: GroupByOption.message,
    };
  }

  public componentWillMount() {
    return this.loadData();
  }

  public render() {
    const { checkupType } = this.props;
    const { currentFilter, currentGroupBy, deprecations, loadingState } = this.state;

    return (
      <Fragment>
        <EuiSpacer />
        <EuiText grow={false}>
          <p>
            This tool runs a series of checks against your Elasticsearch{' '}
            <strong>{checkupType}</strong> to determine whether you can upgrade directly to
            Elasticsearch 7.0, or whether you need to make changes to your data before doing so.
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiPageContent>
          <EuiPageContentBody>
            {loadingState === LoadingState.Error ? (
              <EuiCallOut title="Sorry, there was an error" color="danger" iconType="cross">
                <p>There was a network error retrieving the checkup results.</p>
              </EuiCallOut>
            ) : deprecations && deprecations.filter(filterDeps(currentFilter)).length > 0 ? (
              <Fragment>
                <CheckupControls
                  allDeprecations={deprecations}
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
            ) : (
              <EuiEmptyPrompt
                iconType="faceHappy"
                title={<h2>All clear!</h2>}
                body={
                  <Fragment>
                    <p>
                      You have no <strong>{checkupType}</strong> issues.
                    </p>
                    <p>Check other tabs for issues or return to the overview for next steps.</p>
                  </Fragment>
                }
              />
            )}
          </EuiPageContentBody>
        </EuiPageContent>
      </Fragment>
    );
  }

  private loadData = async () => {
    try {
      this.setState({ loadingState: LoadingState.Loading });
      const resp = await axios.get(chrome.addBasePath('/api/upgrade_checkup/status'));
      this.setState({
        loadingState: LoadingState.Success,
        deprecations: resp.data[this.props.checkupType],
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
    const { deprecations, currentFilter, currentGroupBy } = this.state;

    return (
      <GroupedDeprecations
        currentGroupBy={currentGroupBy}
        currentFilter={currentFilter}
        allDeprecations={deprecations}
      />
    );
  }
}
