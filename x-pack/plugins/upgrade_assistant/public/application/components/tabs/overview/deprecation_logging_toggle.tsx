/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

import { HttpSetup } from 'src/core/public';

import { LoadingState } from '../../types';

interface DeprecationLoggingTabProps extends ReactIntl.InjectedIntlProps {
  http: HttpSetup;
}

interface DeprecationLoggingTabState {
  loadingState: LoadingState;
  loggingEnabled?: boolean;
}

export class DeprecationLoggingToggleUI extends React.Component<
  DeprecationLoggingTabProps,
  DeprecationLoggingTabState
> {
  constructor(props: DeprecationLoggingTabProps) {
    super(props);

    this.state = {
      loadingState: LoadingState.Loading,
    };
  }

  public UNSAFE_componentWillMount() {
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
        id="xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch"
        data-test-subj="upgradeAssistantDeprecationToggle"
        label={this.renderLoggingState()}
        checked={loggingEnabled || false}
        onChange={this.toggleLogging}
        disabled={loadingState === LoadingState.Loading || loadingState === LoadingState.Error}
      />
    );
  }

  private renderLoggingState() {
    const { intl } = this.props;
    const { loggingEnabled, loadingState } = this.state;

    if (loadingState === LoadingState.Error) {
      return intl.formatMessage({
        id:
          'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.errorLabel',
        defaultMessage: 'Could not load logging state',
      });
    } else if (loggingEnabled) {
      return intl.formatMessage({
        id:
          'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.enabledLabel',
        defaultMessage: 'On',
      });
    } else {
      return intl.formatMessage({
        id:
          'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.disabledLabel',
        defaultMessage: 'Off',
      });
    }
  }

  private loadData = async () => {
    try {
      this.setState({ loadingState: LoadingState.Loading });
      const resp = await this.props.http.get('/api/upgrade_assistant/deprecation_logging');
      this.setState({
        loadingState: LoadingState.Success,
        loggingEnabled: resp.isEnabled,
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

      const resp = await this.props.http.put('/api/upgrade_assistant/deprecation_logging', {
        body: JSON.stringify({
          isEnabled: newEnabled,
        }),
      });

      this.setState({
        loadingState: LoadingState.Success,
        loggingEnabled: resp.isEnabled,
      });
    } catch (e) {
      this.setState({ loadingState: LoadingState.Error });
    }
  };
}

export const DeprecationLoggingToggle = injectI18n(DeprecationLoggingToggleUI);
