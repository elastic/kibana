/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
} from '@elastic/eui';

export class MultiJobActionsMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
    };
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
        aria-label="Next"
        color="text"
      />
    );

    const s = (this.props.jobs.length > 1) ? 's' : '';
    const items = [
      (
        <EuiContextMenuItem
          key="delete"
          icon="trash"
          onClick={() => { this.closePopover(); }}
        >
          Delete job{s}
        </EuiContextMenuItem>
      )
    ];

    if(stoppable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="stop datafeed"
          icon="stop"
          onClick={() => { this.closePopover(); }}
        >
          Stop datafeed{s}
        </EuiContextMenuItem>
      );
    }

    if(startable(this.props.jobs)) {
      items.push(
        <EuiContextMenuItem
          key="start datafeed"
          icon="play"
          onClick={() => { this.closePopover(); }}
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

function startable(jobs) {
  return (jobs.find(j => j.datafeedState === 'stopped') !== undefined);
}

function stoppable(jobs) {
  return (jobs.find(j => j.datafeedState === 'started') !== undefined);
}

