/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { CONFIG_TELEMETRY_DESC, PRIVACY_STATEMENT_URL } from '../../../common/constants';
import { OptInExampleFlyout } from '../../components';

/**
 * React component for displaying the Telemetry opt-in banner.
 *
 * TODO: When Jest tests become available in X-Pack, we should add one for this component.
 */
export class OptInBanner extends Component {
  static propTypes = {
    /**
     * Callback function with no parameters that returns a {@code Promise} containing the
     * telemetry data (expected to be an array).
     */
    fetchTelemetry: PropTypes.func.isRequired,
    /**
     * Callback function passed a boolean to opt in ({@code true}) or out ({@code false}).
     */
    optInClick: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      showDetails: false,
      showExample: false,
    };
  }

  render() {
    let title = CONFIG_TELEMETRY_DESC;
    let details;
    let flyoutDetails;

    if (this.state.showDetails) {
      details = (
        <EuiText>
          <p tabIndex="0">
            No information about the data you process or store will be sent. This feature
            will periodically send basic feature usage statistics. See an {(
              <EuiLink onClick={() => this.setState({ showExample: !this.state.showExample })}>
                example
              </EuiLink>
            )} or read our {(
              <EuiLink
                href={PRIVACY_STATEMENT_URL}
                target="_blank"
              >
                telemetry privacy statement
              </EuiLink>
            )}. You can disable this feature at any time.
          </p>
        </EuiText>
      );

      if (this.state.showExample) {
        flyoutDetails = (
          <OptInExampleFlyout
            onClose={() => this.setState({ showExample: false })}
            fetchTelemetry={this.props.fetchTelemetry}
          />
        );
      }
    } else {
      title = (
        <Fragment>
          {CONFIG_TELEMETRY_DESC} {(
            <EuiLink onClick={() => this.setState({ showDetails: true })}>
              Read more
            </EuiLink>
          )}
        </Fragment>
      );
    }

    const titleNode = (
      <span tabIndex="0">{title}</span>
    );

    return (
      <EuiCallOut iconType="questionInCircle" title={titleNode}>
        { details }
        { flyoutDetails }
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() => this.props.optInClick(true)}
            >
              Yes
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() => this.props.optInClick(false)}
            >
              No
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    );
  }
}
