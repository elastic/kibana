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
  EuiSpacer,
} from '@elastic/eui';


export class JobsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      jobsSummaryList: [],
      updateJobStats: () => {},
    };
  }

  setUpdateJobStats = (updateJobStats) => {
    this.setState({ updateJobStats });
  }

  unsetUpdateJobStats = () => {
    this.setUpdateJobStats(() => {});
  }

  render() {
    return (
      <React.Fragment>
        <JobStatsBar
          setUpdateJobStats={this.setUpdateJobStats}
          unsetUpdateJobStats={this.unsetUpdateJobStats}
        />
        <div className="job-management">
          <NodeAvailableWarning />
          <header>
            <div className="new-job-button-container">
              <NewJobButton />
            </div>
          </header>

          <div className="clear" />

          <EuiSpacer size="s" />

          <JobsListView updateJobStats={this.state.updateJobStats} />
        </div>
      </React.Fragment>
    );
  }
}
