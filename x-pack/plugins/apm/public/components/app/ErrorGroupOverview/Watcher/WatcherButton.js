/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover
} from '@elastic/eui';
import chrome from 'ui/chrome';

export default class WatcherButton extends Component {
  state = {
    isPopoverOpen: false
  };

  onButtonClick = () => this.setState({ isPopoverOpen: true });
  closePopover = () => this.setState({ isPopoverOpen: false });

  popOverItems = [
    <EuiContextMenuItem
      key="create"
      icon="plusInCircle"
      onClick={() => {
        this.closePopover();
        this.props.onOpenFlyout();
      }}
    >
      Create new watch
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="view"
      icon="tableOfContents"
      onClick={() => {
        window.location = chrome.addBasePath(
          '/app/kibana#/management/elasticsearch/watcher/'
        );
      }}
    >
      View existing watches
    </EuiContextMenuItem>
  ];

  button = (
    <EuiButton
      size="s"
      iconType="arrowDown"
      iconSide="right"
      onClick={this.onButtonClick}
    >
      Watcher
    </EuiButton>
  );

  render() {
    return (
      <EuiPopover
        id="watcher"
        button={this.button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        ownFocus
      >
        <div style={{ width: '210px' }}>
          <EuiContextMenuPanel items={this.popOverItems} />
        </div>
      </EuiPopover>
    );
  }
}
