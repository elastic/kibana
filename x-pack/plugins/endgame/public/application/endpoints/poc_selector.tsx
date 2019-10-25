/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import React, { PureComponent } from 'react';
import { withRouter } from 'react-router-dom';
import { endpointsSubRoutes } from './endpoints_sub_route_paths';

class PocSelector extends PureComponent {
  state = {
    isPopoverOpen: false,
  };

  onButtonClick = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const { history } = this.props;

    const menuButton = (
      <EuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick}>
        Select POC
      </EuiButton>
    );

    return (
      <EuiPopover
        id="endpoints_sub_menu"
        button={menuButton}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          items={endpointsSubRoutes.map(({ name, id, path, icon }) => (
            <EuiContextMenuItem
              key={id}
              icon={icon || 'empty'}
              onClick={() => {
                this.closePopover();
                history.push(path);
              }}
            >
              {name}
            </EuiContextMenuItem>
          ))}
        />
      </EuiPopover>
    );
  }
}

export const PocSelectorConnected = withRouter(PocSelector);
