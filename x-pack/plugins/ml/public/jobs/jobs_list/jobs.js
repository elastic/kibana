/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import './styles/main.less';
import { NewJobButton } from './components/new_job_button';
import { JobsListView } from './components/jobs_list_view';
import { JobStatsBar } from './components/jobs_stats_bar';
import { NodeAvailableWarning } from './components/node_available_warning';

import React, {
  Component
} from 'react';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';


export class JobsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isRefreshing: false,
      jobsSummaryList: [],
      updateJobStats: () => {},
    };

    this.refreshJobs = () => {};
  }

  setUpdateJobStats = (updateJobStats) => {
    this.setState({ updateJobStats });
  }

  unsetUpdateJobStats = () => {
    this.setUpdateJobStats(() => {});
  }

  setRefreshJobs = (refreshJobs) => {
    this.refreshJobs = refreshJobs;
  }

  unsetRefreshJobs = () => {
    this.setRefreshJobs(() => {});
  }

  onRefreshClick = () => {
    this.setState({ isRefreshing: true });
    this.refreshJobs();
  }

  isDoneRefreshing = () => {
    this.setState({ isRefreshing: false });
  }

  render() {
    const { isRefreshing } = this.state;
    return (
      <React.Fragment>
        <JobStatsBar
          setUpdateJobStats={this.setUpdateJobStats}
          unsetUpdateJobStats={this.unsetUpdateJobStats}
        />
        <div className="job-management">
          <NodeAvailableWarning />
          <header>
            <div className="job-buttons-container">
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={this.onRefreshClick}
                    isLoading={isRefreshing}
                  >
                    Refresh
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <NewJobButton />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </header>

          <div className="clear" />

          <EuiSpacer size="s" />

          <JobsListView
            updateJobStats={this.state.updateJobStats}
            setRefreshJobs={this.setRefreshJobs}
            unsetRefreshJobs={this.unsetRefreshJobs}
            setRefreshDone={this.isDoneRefreshing}
          />
        </div>
      </React.Fragment>
    );
  }
}
