/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiSwitch, EuiText } from '@elastic/eui';

import chrome from 'ui/chrome';
import { LoadingState } from '../cluster_checkup/types';

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
      <EuiFlexGroup>
        <EuiFlexItem grow>
          <div>
            <EuiSwitch
              label="Deprecation Logging"
              checked={loggingEnabled}
              onChange={this.toggleLogging}
              disabled={loadingState === LoadingState.Loading}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{this.renderLoggingState()}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private renderLoggingState() {
    const { loggingEnabled, loadingState } = this.state;

    if (loadingState === LoadingState.Error) {
      return <EuiText color="danger">Could not load logging state.</EuiText>;
    } else if (loggingEnabled === undefined) {
      return null;
    } else if (loggingEnabled) {
      return <EuiHealth color="success">Enabled</EuiHealth>;
    } else {
      return <EuiHealth color="danger">Disabled</EuiHealth>;
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
