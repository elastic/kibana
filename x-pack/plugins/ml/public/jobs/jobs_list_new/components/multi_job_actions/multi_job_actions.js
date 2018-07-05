/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

import { ResultLinks } from '../job_actions';
import { MultiJobActionsMenu } from './actions_menu';
import './styles/main.less';

export class MultiJobActions extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const s = (this.props.selectedJobs.length > 1) ? 's' : '';
    return (
      <div className="multi-select-actions">
        {this.props.selectedJobs.length > 0 &&
          <React.Fragment>
            <span className="jobs-selected-title">{this.props.selectedJobs.length} job{s} selected</span>
            <div className="actions-border-large" />
            <ResultLinks jobs={this.props.selectedJobs} />
            <MultiJobActionsMenu
              jobs={this.props.selectedJobs}
              showStartDatafeedModal={this.props.showStartDatafeedModal}
              showDeleteJobModal={this.props.showDeleteJobModal}
              refreshJobs={this.props.refreshJobs}
            />
          </React.Fragment>
        }
      </div>
    );
  }
}
MultiJobActions.propTypes = {
  selectedJobs: PropTypes.array.isRequired,
  showStartDatafeedModal: PropTypes.func.isRequired,
  showDeleteJobModal: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
};
