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
  state = {
    isShowingFlyout: true,
    esMonitoringUrl: ''
  }

  renderFlyout() {
    const { isShowingFlyout, esMonitoringUrl } = this.state;
    const { clusterCapabilities } = this.props;

    if (!isShowingFlyout) {
      return null;
    }

    const instructionOpts = {
      kibanaUrl: '',
      esMonitoringUrl: '',
      checkForData: () => {}
    };

    return (
      <Flyout
        onClose={() => this.setState({ isShowingFlyout: false })}
        products={clusterCapabilities}
        instructionOpts={instructionOpts}
        esMonitoringUrl={esMonitoringUrl}
        setMonitoringUrl={esMonitoringUrl => this.setState({ esMonitoringUrl })}
      />
    );
  }

  render() {
    const { clusterCapabilities } = this.props;

    const isFullyMigrated = Object.values(clusterCapabilities).reduce((isFullyMigrated, cap) => {
      return isFullyMigrated && cap.isFullyMigrated;
    }, true);

    if (isFullyMigrated) {
      return null;
    }

    let title = '';
    if (clusterCapabilities.isInternalCollector) {
      title = 'Hey! You are using internal collection. Why?';
    }

    return (
      <div>
        <EuiCallOut
          title={title}
          color="warning"
        >
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton fill={true} onClick={() => this.setState({ isShowingFlyout: true })}>
               Use Wizard
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty href="http://www.elastic.co">
                Use the docs
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
        <EuiSpacer/>
        {this.renderFlyout()}
      </div>
    );
  }
}
