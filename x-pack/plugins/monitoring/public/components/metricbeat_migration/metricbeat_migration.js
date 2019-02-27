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
      // esMonitoringUrl: props.monitoringHosts ? props.monitoringHosts[0] : '',
      // checkingMigrationStatus: false,
      // checkedMigrationStatus: false,
      // updatedProducts: null,
    };
  }

  renderFlyout() {
    const { isShowingFlyout } = this.state;
    const { clusterCapabilities, fetchCapabilities, setCapabilitiesFetchingPaused, updateData } = this.props;

    if (!isShowingFlyout) {
      return null;
    }

    // const instructionOpts = {
    //   kibanaUrl: '',
    //   esMonitoringUrl,
    //   migrationSuccessful: true,
    //   checkingMigrationStatus,
    //   checkForMigrationStatus: async () => {
    // this.setState({ checkingMigrationStatus: true });
    // this.props.setCapabilitiesFetchingPaused(false);
    // await fetchCapabilities();
    // this.props.setCapabilitiesFetchingPaused(true);
    // this.setState({ checkingMigrationStatus: false, checkedMigrationStatus: true });
    //   }
    // };

    return (
      <Flyout
        onClose={() => this.closeFlyout()}
        products={clusterCapabilities}
        updateData={updateData}
        fetchCapabilities={fetchCapabilities}
        setCapabilitiesFetchingPaused={setCapabilitiesFetchingPaused}
        // updatedProducts={updatedProducts}
        // checkingMigrationStatus={checkingMigrationStatus}
        // checkedMigrationStatus={checkedMigrationStatus}
        // instructionOpts={instructionOpts}
        // esMonitoringUrl={esMonitoringUrl}
        // setMonitoringUrl={esMonitoringUrl => this.setState({ esMonitoringUrl })}
      />
    );
  }

  showFlyout() {
    this.props.setCapabilitiesFetchingPaused(true);
    this.setState({ isShowingFlyout: true });
  }

  closeFlyout() {
    this.props.setCapabilitiesFetchingPaused(false);
    this.setState({ isShowingFlyout: false });
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
              <EuiButton fill={true} onClick={() => this.showFlyout()}>
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
