/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiLoadingSpinner,
  EuiPortal, // EuiPortal is a temporary requirement to use EuiFlyout with "ownFocus"
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

/**
 * React component for displaying the example data associated with the Telemetry opt-in banner.
 */
export class OptInExampleFlyout extends Component {

  static propTypes = {
    /**
     * Callback function with no parameters that returns a {@code Promise} containing the
     * telemetry data (expected to be an array).
     */
    fetchTelemetry: PropTypes.func.isRequired,
    /**
     * Callback function with no parameters that closes this flyout.
     */
    onClose: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      data: null,
      isLoading: true,
    };
  }

  componentDidMount() {
    this.props.fetchTelemetry()
      .then(response => this.setState({ data: Array.isArray(response.data) ? response.data : null, isLoading: false }))
      .catch(() => this.setState({ isLoading: false }));
  }

  renderBody({ data, isLoading }) {
    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (data === null) {
      return (
        <EuiCallOut
          title="Error loading cluster statistics"
          color="danger"
          iconType="cross"
        >
          An unexpected error occured while attempting to fetch the cluster statistics. This can occur because Elasticsearch
          failed, Kibana failed, or there is a network error. Check Kibana, then reload the page and try again.
        </EuiCallOut>
      );
    }

    return (
      <EuiCodeBlock language="js">
        {JSON.stringify(data, null, 2)}
      </EuiCodeBlock>
    );
  }

  render() {
    return (
      <EuiPortal>
        <EuiFlyout
          ownFocus
          onClose={this.props.onClose}
          maxWidth={true}
        >
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>Cluster statistics</h2>
            </EuiTitle>
            <EuiTextColor color="subdued">
              <EuiText>
                This is an example of the basic cluster statistics that we&rsquo;ll collect.
                It includes the number of indices, shards, and nodes.
                It also includes high-level usage statistics, such as whether monitoring is turned on.
              </EuiText>
            </EuiTextColor>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {this.renderBody(this.state)}
          </EuiFlyoutBody>
        </EuiFlyout>
      </EuiPortal>
    );
  }

}
