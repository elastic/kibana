/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
} from '@elastic/eui';

import { ConfirmDeleteModal } from './confirm_delete_modal';
import { flattenPanelTree } from '../../../services';

class JobActionMenuUi extends Component {
  static propTypes = {
    startJobs: PropTypes.func.isRequired,
    stopJobs: PropTypes.func.isRequired,
    deleteJobs: PropTypes.func.isRequired,
    cloneJob: PropTypes.func.isRequired,
    isUpdating: PropTypes.bool.isRequired,
    iconSide: PropTypes.string,
    anchorPosition: PropTypes.string,
    label: PropTypes.node,
    iconType: PropTypes.string,
    jobs: PropTypes.array,
  };

  static defaultProps = {
    iconSide: 'right',
    anchorPosition: 'rightUp',
    iconType: 'arrowDown',
    jobs: [],
  };

  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      showDeleteConfirmation: false,
    };
  }

  panels() {
    const { startJobs, stopJobs, cloneJob } = this.props;

    const isSingleSelection = this.isSingleSelection() ? 1 : 0;

    const items = [];

    if (this.canStartJobs()) {
      items.push({
        name: i18n.translate('xpack.rollupJobs.jobActionMenu.startJobLabel', {
          defaultMessage: 'Start {isSingleSelection, plural, one {job} other {jobs}}',
          values: { isSingleSelection },
        }),
        icon: <EuiIcon type="play" />,
        onClick: () => {
          this.closePopover();
          startJobs();
        },
      });
    }

    if (this.canStopJobs()) {
      items.push({
        name: i18n.translate('xpack.rollupJobs.jobActionMenu.stopJobLabel', {
          defaultMessage: 'Stop {isSingleSelection, plural, one {job} other {jobs}}',
          values: { isSingleSelection },
        }),
        icon: <EuiIcon type="stop" />,
        onClick: () => {
          this.closePopover();
          stopJobs();
        },
      });
    }

    if (this.canCloneJob()) {
      items.push({
        name: i18n.translate('xpack.rollupJobs.jobActionMenu.cloneJobLabel', {
          defaultMessage: 'Clone job',
        }),
        icon: <EuiIcon data-test-subj="jobCloneActionContextMenu" type="copy" />,
        onClick: () => {
          this.closePopover();
          const { jobs } = this.props;
          cloneJob(jobs[0]);
        },
      });
    }

    if (this.canDeleteJobs()) {
      items.push({
        name: i18n.translate('xpack.rollupJobs.jobActionMenu.deleteJobLabel', {
          defaultMessage: 'Delete {isSingleSelection, plural, one {job} other {jobs}}',
          values: {
            isSingleSelection,
          },
        }),
        icon: <EuiIcon type="trash" />,
        onClick: () => {
          this.closePopover();
          this.openDeleteConfirmationModal();
        },
      });
    }

    const panelTree = {
      id: 0,
      title: i18n.translate('xpack.rollupJobs.jobActionMenu.panelTitle', {
        defaultMessage: 'Job options',
      }),
      items,
    };

    return flattenPanelTree(panelTree);
  }

  onButtonClick = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  closeDeleteConfirmationModal = () => {
    this.setState({ showDeleteConfirmation: false });
  };

  openDeleteConfirmationModal = () => {
    this.setState({ showDeleteConfirmation: true });
  };

  canStartJobs() {
    const { jobs } = this.props;
    return jobs.some((job) => job.status === 'stopped');
  }

  canStopJobs() {
    const { jobs } = this.props;
    return jobs.some((job) => job.status === 'started');
  }

  canCloneJob() {
    const { jobs } = this.props;
    return Boolean(jobs && jobs.length === 1);
  }

  canDeleteJobs() {
    const { jobs } = this.props;
    const areAllJobsStopped = jobs.findIndex((job) => job.status === 'started') === -1;
    return areAllJobsStopped;
  }

  confirmDeleteModal = () => {
    const { showDeleteConfirmation } = this.state;

    if (!showDeleteConfirmation) {
      return null;
    }

    const { deleteJobs, jobs } = this.props;

    const onConfirmDelete = () => {
      this.closePopover();
      deleteJobs();
    };

    const isSingleSelection = this.isSingleSelection();

    return (
      <ConfirmDeleteModal
        isSingleSelection={isSingleSelection}
        jobs={jobs}
        onConfirm={onConfirmDelete}
        onCancel={this.closeDeleteConfirmationModal}
      />
    );
  };

  isSingleSelection = () => {
    return this.props.jobs.length === 1;
  };

  render() {
    const { isUpdating } = this.props;

    if (isUpdating) {
      return (
        <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <FormattedMessage
                id="xpack.rollupJobs.jobActionMenu.updatingText"
                defaultMessage="Updating"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    const jobCount = this.props.jobs.length;

    const {
      iconSide,
      anchorPosition,
      iconType,
      label = i18n.translate('xpack.rollupJobs.jobActionMenu.buttonLabel', {
        defaultMessage: 'Manage {jobCount, plural, one {job} other {jobs}}',
        values: { jobCount },
      }),
    } = this.props;

    const panels = this.panels();

    const actionsAriaLabel = i18n.translate(
      'xpack.rollupJobs.jobActionMenu.jobActionMenuButtonAriaLabel',
      {
        defaultMessage: 'Job options',
      }
    );

    const button = (
      <EuiButton
        data-test-subj="jobActionMenuButton"
        iconSide={iconSide}
        aria-label={actionsAriaLabel}
        onClick={this.onButtonClick}
        iconType={iconType}
        fill
      >
        {label}
      </EuiButton>
    );

    return (
      <div>
        {this.confirmDeleteModal()}
        <EuiPopover
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover}
          panelPaddingSize="none"
          anchorPosition={anchorPosition}
          repositionOnScroll
        >
          <EuiContextMenu
            data-test-subj="jobActionContextMenu"
            initialPanelId={0}
            panels={panels}
          />
        </EuiPopover>
      </div>
    );
  }
}

export const JobActionMenu = JobActionMenuUi;
