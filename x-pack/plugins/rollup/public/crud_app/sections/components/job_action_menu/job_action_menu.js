/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiContextMenu,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';

import { ConfirmDeleteModal } from './confirm_delete_modal';
import { flattenPanelTree } from '../../../services';

class JobActionMenuUi extends Component {
  static propTypes = {
    startJobs: PropTypes.func.isRequired,
    stopJobs: PropTypes.func.isRequired,
    deleteJobs: PropTypes.func.isRequired,
    iconSide: PropTypes.string,
    anchorPosition: PropTypes.string,
    label: PropTypes.node,
    iconType: PropTypes.string,
    jobs: PropTypes.array,
  }

  static defaultProps = {
    iconSide: 'right',
    anchorPosition: 'rightUp',
    iconType: 'arrowDown',
    jobs: [],
  }

  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      showDeleteConfirmation: false
    };
  }

  panels() {
    const {
      startJobs,
      stopJobs,
      intl,
    } = this.props;

    const isSingleSelection = this.isSingleSelection();
    const entity = this.getEntity(isSingleSelection);

    const items = [];

    if (this.canStartJobs()) {
      items.push({
        name: intl.formatMessage({
          id: 'xpack.rollupJobs.jobActionMenu.startJobLabel',
          defaultMessage: 'Start {entity}',
        }, { entity }),
        icon: <EuiIcon type="play" />,
        onClick: () => {
          this.closePopover();
          startJobs();
        },
      });
    }

    if (this.canStopJobs()) {
      items.push({
        name: intl.formatMessage({
          id: 'xpack.rollupJobs.jobActionMenu.stopJobLabel',
          defaultMessage: 'Stop {entity}',
        }, { entity }),
        icon: <EuiIcon type="stop" />,
        onClick: () => {
          this.closePopover();
          stopJobs();
        },
      });
    }

    items.push({
      name: intl.formatMessage({
        id: 'xpack.rollupJobs.jobActionMenu.deleteJobLabel',
        defaultMessage: 'Delete {entity}',
      }, { entity }),
      icon: <EuiIcon type="trash" />,
      onClick: () => {
        this.closePopover();
        this.openDeleteConfirmationModal();
      },
    });

    const upperCasedEntity = `${entity[0].toUpperCase()}${entity.slice(1)}`;
    const panelTree = {
      id: 0,
      title: intl.formatMessage({
        id: 'xpack.rollupJobs.jobActionMenu.panelTitle',
        defaultMessage: '{upperCasedEntity} options',
      }, { upperCasedEntity }),
      items,
    };

    return flattenPanelTree(panelTree);
  }

  onButtonClick = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false
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
    return jobs.some(job => job.status === 'stopped');
  }

  canStopJobs() {
    const { jobs } = this.props;
    return jobs.some(job => job.status === 'started');
  }

  confirmDeleteModal = () => {
    const { showDeleteConfirmation } = this.state;

    if (!showDeleteConfirmation) {
      return null;
    }

    const {
      deleteJobs,
      jobs,
    } = this.props;

    const onConfirmDelete = () => {
      this.closePopover();
      deleteJobs();
    };

    const isSingleSelection = this.isSingleSelection();
    const entity = this.getEntity(isSingleSelection);

    return (
      <ConfirmDeleteModal
        isSingleSelection={isSingleSelection}
        entity={entity}
        jobs={jobs}
        onConfirm={onConfirmDelete}
        onCancel={this.closeDeleteConfirmationModal}
      />
    );
  };

  isSingleSelection = () => {
    return this.props.jobs.length === 1;
  };

  getEntity = isSingleSelection => {
    return isSingleSelection ? 'job' : 'jobs';
  };

  render() {
    const { intl } = this.props;
    const jobCount = this.props.jobs.length;

    const {
      iconSide,
      anchorPosition,
      iconType,
      label = intl.formatMessage({
        id: 'xpack.rollupJobs.jobActionMenu.buttonLabel',
        defaultMessage: 'Manage {jobCount, plural, one {job} other {jobs}}',
      }, { jobCount }),
    } = this.props;

    const panels = this.panels();
    const isSingleSelection = this.isSingleSelection();
    const entity = this.getEntity(isSingleSelection);

    const button = (
      <EuiButton
        data-test-subj="jobActionMenuButton"
        iconSide={iconSide}
        aria-label={`${entity} options`}
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
          id={`actionMenu${entity}`}
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover}
          panelPaddingSize="none"
          withTitle
          anchorPosition={anchorPosition}
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </div>
    );
  }
}

export const JobActionMenu = injectI18n(JobActionMenuUi);
