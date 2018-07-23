/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { checkPermission } from 'plugins/ml/privilege/check_privilege';
import { mlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
} from '@elastic/eui';

import {
  closeJobs,
  stopDatafeeds,
  isStartable,
  isStoppable,
  isClosable,
} from '../utils';

export class MultiJobActionsMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
    };

    this.canDeleteJob = checkPermission('canDeleteJob');
    this.canStartStopDatafeed = (checkPermission('canStartStopDatafeed') && mlNodesAvailable());
    this.canCloseJob = (checkPermission('canCloseJob') && mlNodesAvailable());
  }

  onButtonClick = () => {
    this.setState(prevState => ({
      isOpen: !prevState.isOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isOpen: false,
    });
  };

  render() {
    const button = (
      <EuiButtonIcon
        size="s"
        onClick={this.onButtonClick}
        iconType="gear"
        aria-label="Management actions"
        color="text"
        disabled={(this.canDeleteJob === false && this.canStartStopDatafeed === false)}
      />
    );

    const s = (this.props.jobs.length > 1) ? 's' : '';
    const items = [
      (
        <EuiContextMenuItem
          key="delete"
          icon="trash"
          disabled={(this.canDeleteJob === false)}
          onClick={() => { this.props.showDeleteJobModal(this.props.jobs); this.closePopover(); }}
        >
          Delete job{s}
        </EuiContextMenuItem>
      )
    ];

    if(isClosable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="close job"
          icon="cross"
          disabled={(this.canCloseJob === false)}
          onClick={() => { closeJobs(this.props.jobs); this.closePopover(); }}
        >
          Close job{s}
        </EuiContextMenuItem>
      );
    }

    if(isStoppable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="stop datafeed"
          icon="stop"
          disabled={(this.canStartStopDatafeed === false)}
          onClick={() => { stopDatafeeds(this.props.jobs, this.props.refreshJobs); this.closePopover(); }}
        >
          Stop datafeed{s}
        </EuiContextMenuItem>
      );
    }

    if(isStartable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="start datafeed"
          icon="play"
          disabled={(this.canStartStopDatafeed === false)}
          onClick={() => { this.props.showStartDatafeedModal(this.props.jobs); this.closePopover(); }}
        >
          Start datafeed{s}
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
        <EuiContextMenuPanel
          items={items.reverse()}
        />
      </EuiPopover>
    );
  }
}
MultiJobActionsMenu.propTypes = {
  jobs: PropTypes.array.isRequired,
  showStartDatafeedModal: PropTypes.func.isRequired,
  showDeleteJobModal: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
};
