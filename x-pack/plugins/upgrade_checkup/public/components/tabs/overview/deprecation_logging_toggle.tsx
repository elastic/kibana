/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import React from 'react';

import { EuiSwitch } from '@elastic/eui';

import chrome from 'ui/chrome';
import { LoadingState } from '../../types';

interface DeprecationLoggingTabState {
  loadingState: LoadingState;
  loggingEnabled?: boolean;
}

export class DeprecationLoggingToggle extends React.Component<{}, DeprecationLoggingTabState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      loadingState: LoadingState.Loading,
    };
  }

  public componentWillMount() {
    this.loadData();
  }

  public render() {
    const { loggingEnabled, loadingState } = this.state;

    return (
      <EuiSwitch
        label={this.renderLoggingState()}
        checked={loggingEnabled}
        onChange={this.toggleLogging}
        disabled={loadingState === LoadingState.Loading || loadingState === LoadingState.Error}
      />
    );
  }

  private renderLoggingState() {
    const { loggingEnabled, loadingState } = this.state;

    if (loadingState === LoadingState.Error) {
      return 'Could not load logging state';
    } else if (loggingEnabled === undefined) {
      return null; // TODO: Something better to put here than nothing?
    } else if (loggingEnabled) {
      return 'On';
    } else {
      return 'Off';
    }
  }

  private loadData = async () => {
    try {
      this.setState({ loadingState: LoadingState.Loading });
      const resp = await axios.get(chrome.addBasePath('/api/upgrade_checkup/deprecation_logging'));
      this.setState({
        loadingState: LoadingState.Success,
        loggingEnabled: resp.data.isEnabled,
      });
    } catch (e) {
      this.setState({ loadingState: LoadingState.Error });
    }
  };

  private toggleLogging = async () => {
    try {
      this.setState({ loadingState: LoadingState.Loading });

      const resp = await axios.put(
        chrome.addBasePath('/api/upgrade_checkup/deprecation_logging'),
        {
          isEnabled: !this.state.loggingEnabled,
        },
        {
          headers: {
            'kbn-xsrf': chrome.getXsrfToken(),
          },
        }
      );

      this.setState({
        loadingState: LoadingState.Success,
        loggingEnabled: resp.data.isEnabled,
      });
    } catch (e) {
      this.setState({ loadingState: LoadingState.Error });
    }
  };
}
