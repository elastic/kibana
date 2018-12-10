/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import chrome from 'ui/chrome';
import { EuiButton, EuiContextMenu, EuiIcon, EuiPopover } from '@elastic/eui';

export default class WatcherButton extends Component {
  state = {
    isPopoverOpen: false
  };

  onButtonClick = () => this.setState({ isPopoverOpen: true });
  closePopover = () => this.setState({ isPopoverOpen: false });

  popOverPanels = [
    {
      id: 0,
      title: 'Watcher',
      items: [
        {
          name: 'Enable error reports',
          icon: <EuiIcon type="plusInCircle" size="m" />,
          onClick: () => {
            this.closePopover();
            this.props.onOpenFlyout();
          }
        },
        {
          name: 'View existing watches',
          icon: 'tableOfContents',
          href: chrome.addBasePath(
            '/app/kibana#/management/elasticsearch/watcher/'
          ),
          target: '_blank',
          onClick: () => this.closePopover()
        }
      ]
    }
  ];

  button = (
    <EuiButton
      size="s"
      iconType="arrowDown"
      iconSide="right"
      onClick={this.onButtonClick}
    >
      Integrations
    </EuiButton>
  );

  render() {
    return (
      <EuiPopover
        button={this.button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <EuiContextMenu initialPanelId={0} panels={this.popOverPanels} />
      </EuiPopover>
    );
  }
}
