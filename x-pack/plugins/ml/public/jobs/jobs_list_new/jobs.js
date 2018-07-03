/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import './styles/main.less';
import { NewJobButton } from './components/new_job_button';
import { JobsListView } from './components/jobs_list_view';

import React, {
  Component
} from 'react';

import {
  EuiHorizontalRule,
} from '@elastic/eui';

export class JobsPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
    };
  }

  render() {
    return (
      <div className="job-management">
        <header>
          <div className="new-job-button-container">
            <NewJobButton />
          </div>
        </header>

        <div className="clear" />

        <EuiHorizontalRule margin="m" />

        <JobsListView />
      </div>
    );
  }
}
