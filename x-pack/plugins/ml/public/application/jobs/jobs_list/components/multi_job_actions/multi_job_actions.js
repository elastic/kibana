/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';

import { EuiTitle } from '@elastic/eui';

import { ResultLinks } from '../job_actions';
import { MultiJobActionsMenu } from './actions_menu';
import { GroupSelector } from './group_selector';
import { FormattedMessage } from '@kbn/i18n/react';

export class MultiJobActions extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const jobsSelected = this.props.selectedJobs.length > 0;
    return (
      <div className={`multi-select-actions${jobsSelected ? '' : '-no-display'}`}>
        {jobsSelected && (
          <Fragment>
            <EuiTitle size="s" style={{ display: 'inline' }}>
              <h3>
                <FormattedMessage
                  id="xpack.ml.jobsList.multiJobsActions.jobsSelectedLabel"
                  defaultMessage="{selectedJobsCount, plural, one {# job} other {# jobs}}   selected"
                  values={{ selectedJobsCount: this.props.selectedJobs.length }}
                />
              </h3>
            </EuiTitle>
            <div className="actions-border-large" />
            <ResultLinks jobs={this.props.selectedJobs} />

            <GroupSelector
              jobs={this.props.selectedJobs}
              allJobIds={this.props.allJobIds}
              refreshJobs={this.props.refreshJobs}
            />

            <MultiJobActionsMenu
              jobs={this.props.selectedJobs}
              showStartDatafeedModal={this.props.showStartDatafeedModal}
              showDeleteJobModal={this.props.showDeleteJobModal}
              refreshJobs={this.props.refreshJobs}
            />
          </Fragment>
        )}
      </div>
    );
  }
}
MultiJobActions.propTypes = {
  selectedJobs: PropTypes.array.isRequired,
  allJobIds: PropTypes.array.isRequired,
  showStartDatafeedModal: PropTypes.func.isRequired,
  showDeleteJobModal: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
};
