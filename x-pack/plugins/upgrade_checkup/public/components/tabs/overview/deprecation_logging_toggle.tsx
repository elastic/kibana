/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import React from 'react';

import { EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';

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

    // Show a spinner until we've done the initial load.
    if (loadingState === LoadingState.Loading && loggingEnabled === undefined) {
      return <EuiLoadingSpinner size="l" />;
    }

    return (
      <EuiSwitch
        data-test-subj="upgradeCheckupDeprecationToggle"
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
      // Optimistically toggle the UI
      const newEnabled = !this.state.loggingEnabled;
      this.setState({ loadingState: LoadingState.Loading, loggingEnabled: newEnabled });

      const resp = await axios.put(
        chrome.addBasePath('/api/upgrade_checkup/deprecation_logging'),
        {
          isEnabled: newEnabled,
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
