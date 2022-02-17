/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkPermission } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check/check_ml_nodes';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';

import {
  closeJobs,
  stopDatafeeds,
  isStartable,
  isStoppable,
  isClosable,
  isResettable,
} from '../utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isManagedJob } from '../../../jobs_utils';

class MultiJobActionsMenuUI extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
    };

    this.canDeleteJob = checkPermission('canDeleteJob');
    this.canStartStopDatafeed = checkPermission('canStartStopDatafeed') && mlNodesAvailable();
    this.canCloseJob = checkPermission('canCloseJob') && mlNodesAvailable();
    this.canResetJob = checkPermission('canResetJob') && mlNodesAvailable();
    this.canCreateMlAlerts = checkPermission('canCreateMlAlerts');
  }

  onButtonClick = () => {
    this.setState((prevState) => ({
      isOpen: !prevState.isOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isOpen: false,
    });
  };

  render() {
    const anyJobsBlocked = this.props.jobs.some((j) => j.blocked !== undefined);
    const button = (
      <EuiButtonIcon
        size="s"
        onClick={this.onButtonClick}
        iconType="gear"
        aria-label={i18n.translate(
          'xpack.ml.jobsList.multiJobActionsMenu.managementActionsAriaLabel',
          {
            defaultMessage: 'Management actions',
          }
        )}
        color="text"
        disabled={
          anyJobsBlocked || (this.canDeleteJob === false && this.canStartStopDatafeed === false)
        }
        data-test-subj="mlADJobListMultiSelectManagementActionsButton"
      />
    );

    const items = [
      <EuiContextMenuItem
        key="delete"
        icon="trash"
        disabled={this.canDeleteJob === false}
        onClick={() => {
          this.props.showDeleteJobModal(this.props.jobs);
          this.closePopover();
        }}
        data-test-subj="mlADJobListMultiSelectDeleteJobActionButton"
      >
        <FormattedMessage
          id="xpack.ml.jobsList.multiJobsActions.deleteJobsLabel"
          defaultMessage="Delete {jobsCount, plural, one {job} other {jobs}}"
          values={{ jobsCount: this.props.jobs.length }}
        />
      </EuiContextMenuItem>,
    ];

    if (isClosable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="close job"
          icon="cross"
          disabled={this.canCloseJob === false}
          onClick={() => {
            if (this.props.jobs.some((j) => isManagedJob(j))) {
              this.props.showCloseJobsConfirmModal(this.props.jobs);
            } else {
              closeJobs(this.props.jobs);
            }

            this.closePopover();
          }}
          data-test-subj="mlADJobListMultiSelectCloseJobActionButton"
        >
          <FormattedMessage
            id="xpack.ml.jobsList.multiJobsActions.closeJobsLabel"
            defaultMessage="Close {jobsCount, plural, one {job} other {jobs}}"
            values={{ jobsCount: this.props.jobs.length }}
          />
        </EuiContextMenuItem>
      );
    }

    if (isResettable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="reset job"
          icon="refresh"
          disabled={this.canCloseJob === false}
          onClick={() => {
            this.props.showResetJobModal(this.props.jobs);
            this.closePopover();
          }}
          data-test-subj="mlADJobListMultiSelectResetJobActionButton"
        >
          <FormattedMessage
            id="xpack.ml.jobsList.multiJobsActions.resetJobsLabel"
            defaultMessage="Reset {jobsCount, plural, one {job} other {jobs}}"
            values={{ jobsCount: this.props.jobs.length }}
          />
        </EuiContextMenuItem>
      );
    }

    if (isStoppable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="stop datafeed"
          icon="stop"
          disabled={this.canStartStopDatafeed === false}
          onClick={() => {
            if (this.props.jobs.some((j) => isManagedJob(j))) {
              this.props.showStopDatafeedsConfirmModal(this.props.jobs);
            } else {
              stopDatafeeds(this.props.jobs, this.props.refreshJobs);
            }
            this.closePopover();
          }}
          data-test-subj="mlADJobListMultiSelectStopDatafeedActionButton"
        >
          <FormattedMessage
            id="xpack.ml.jobsList.multiJobsActions.stopDatafeedsLabel"
            defaultMessage="Stop {jobsCount, plural, one {datafeed} other {datafeeds}}"
            values={{ jobsCount: this.props.jobs.length }}
          />
        </EuiContextMenuItem>
      );
    }

    if (isStartable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="start datafeed"
          icon="play"
          disabled={this.canStartStopDatafeed === false}
          onClick={() => {
            this.props.showStartDatafeedModal(this.props.jobs);
            this.closePopover();
          }}
          data-test-subj="mlADJobListMultiSelectStartDatafeedActionButton"
        >
          <FormattedMessage
            id="xpack.ml.jobsList.multiJobsActions.startDatafeedsLabel"
            defaultMessage="Start {jobsCount, plural, one {datafeed} other {datafeeds}}"
            values={{ jobsCount: this.props.jobs.length }}
          />
        </EuiContextMenuItem>
      );
    }

    if (this.canCreateMlAlerts && this.props.jobs.length === 1) {
      items.push(
        <EuiContextMenuItem
          key="create alert"
          icon="bell"
          disabled={false}
          onClick={() => {
            this.props.showCreateAlertFlyout(this.props.jobs.map(({ id }) => id));
            this.closePopover();
          }}
          data-test-subj="mlADJobListMultiSelectCreateAlertActionButton"
        >
          <FormattedMessage
            id="xpack.ml.jobsList.multiJobsActions.createAlertsLabel"
            defaultMessage="Create alert rule"
          />
        </EuiContextMenuItem>
      );
    }

    return (
      <EuiPopover
        button={button}
        isOpen={this.state.isOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downCenter"
      >
        <EuiContextMenuPanel items={items.reverse()} />
      </EuiPopover>
    );
  }
}
MultiJobActionsMenuUI.propTypes = {
  jobs: PropTypes.array.isRequired,
  showStartDatafeedModal: PropTypes.func.isRequired,
  showDeleteJobModal: PropTypes.func.isRequired,
  showStopDatafeedsConfirmModal: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
  showCreateAlertFlyout: PropTypes.func.isRequired,
};

export const MultiJobActionsMenu = MultiJobActionsMenuUI;
