/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { Flyout } from './flyout';

export class MetricbeatMigration extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isShowingFlyout: false,
      capabilities: null,
    };
  }

  componentWillMount() {
    this.updateCapabilities();
  }

  async updateCapabilities() {
    const { fetchCapabilities } = this.props;

    const capabilities = await fetchCapabilities();
    this.setState({ capabilities });
  }

  renderFlyout() {
    const { isShowingFlyout, capabilities } = this.state;

    if (!isShowingFlyout) {
      return null;
    }

    return (
      <Flyout
        onClose={() => this.closeFlyout()}
        products={capabilities}
        updateCapabilities={() => this.updateCapabilities()}
      />
    );
  }

  showFlyout() {
    this.setState({ isShowingFlyout: true });
  }

  closeFlyout() {
    this.setState({ isShowingFlyout: false });
  }

  render() {
    const { capabilities } = this.state;

    if (!capabilities) {
      return null;
    }

    const isFullyMigrated = Object.values(capabilities).reduce((isFullyMigrated, cap) => {
      return isFullyMigrated && cap.isFullyMigrated;
    }, true);

    if (isFullyMigrated) {
      return null;
    }

    let title = '';
    if (capabilities.isInternalCollector) {
      title = 'Hey! You are using internal collection. Why?';
    }

    return (
      <div>
        <EuiCallOut
          title={title}
          color="warning"
        >
          <p>
            Hey! You should be using Metricbeat to ship this data! Want help migrating?
          </p>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton fill={true} onClick={() => this.showFlyout()}>
               Use Wizard
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty href="http://www.elastic.co">
                Use the docs
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={() => this.updateCapabilities()}>
                Refresh
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
        <EuiSpacer/>
        {this.renderFlyout()}
      </div>
    );
  }
}
