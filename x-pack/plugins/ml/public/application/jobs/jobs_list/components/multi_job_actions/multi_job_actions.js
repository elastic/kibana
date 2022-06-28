/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';

import { ResultLinks } from '../job_actions';
import { MultiJobActionsMenu } from './actions_menu';
import { GroupSelector } from './group_selector';
import { FormattedMessage } from '@kbn/i18n-react';

export class MultiJobActions extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const jobsSelected = this.props.selectedJobs.length > 0;
    return (
      <div
        className={`multi-select-actions${jobsSelected ? '' : '-no-display'}`}
        data-test-subj={`mlADJobListMultiSelectActionsArea ${jobsSelected ? 'active' : 'inactive'}`}
      >
        {jobsSelected && (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            wrap={false}
            direction="row"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.ml.jobsList.multiJobsActions.jobsSelectedLabel"
                    defaultMessage="{selectedJobsCount, plural, one {# job} other {# jobs}}   selected"
                    values={{ selectedJobsCount: this.props.selectedJobs.length }}
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div className="actions-border-large" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ResultLinks jobs={this.props.selectedJobs} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <GroupSelector
                jobs={this.props.selectedJobs}
                allJobIds={this.props.allJobIds}
                refreshJobs={this.props.refreshJobs}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <MultiJobActionsMenu
                jobs={this.props.selectedJobs}
                showCloseJobsConfirmModal={this.props.showCloseJobsConfirmModal}
                showStartDatafeedModal={this.props.showStartDatafeedModal}
                showDeleteJobModal={this.props.showDeleteJobModal}
                showResetJobModal={this.props.showResetJobModal}
                showStopDatafeedsConfirmModal={this.props.showStopDatafeedsConfirmModal}
                refreshJobs={this.props.refreshJobs}
                showCreateAlertFlyout={this.props.showCreateAlertFlyout}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </div>
    );
  }
}
MultiJobActions.propTypes = {
  selectedJobs: PropTypes.array.isRequired,
  allJobIds: PropTypes.array.isRequired,
  showStartDatafeedModal: PropTypes.func.isRequired,
  showCloseJobsConfirmModal: PropTypes.func.isRequired,
  showDeleteJobModal: PropTypes.func.isRequired,
  showResetJobModal: PropTypes.func.isRequired,
  showStopDatafeedsConfirmModal: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
  showCreateAlertFlyout: PropTypes.func.isRequired,
};
