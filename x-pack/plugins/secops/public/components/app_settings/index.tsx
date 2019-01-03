/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { AppSettingsPopover } from './app_settings_popover';

export interface State {
  showPopover: boolean;
}

export class AppSettings extends React.PureComponent<{}, State> {
  public readonly state = {
    showPopover: false,
  };

  public render() {
    return (
      <AppSettingsPopover
        onClick={this.onClick}
        onClose={this.onClose}
        showPopover={this.state.showPopover}
      />
    );
  }

  private onClick = () => {
    this.setState({
      showPopover: !this.state.showPopover,
    });
  };

  private onClose = () => {
    this.setState({
      showPopover: false,
    });
  };
}
