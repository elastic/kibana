/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiCheckbox,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { showTelemetryOptIn, getTelemetryFetcher, PRIVACY_STATEMENT_URL, OptInExampleFlyout } from '../../lib/telemetry';

export class TelemetryOptIn extends React.Component {
  constructor() {
    super();
    this.state = {
      showMoreTelemetryInfo: false,
      isOptingInToTelemetry: false,
      showExample: false
    };
  }
  isOptingInToTelemetry = () => {
    return this.state.isOptingInToTelemetry;
  }
  render() {
    const { showMoreTelemetryInfo, isOptingInToTelemetry, showExample } = this.state;
    const { isStartTrial } = this.props;
    let example = null;
    if (showExample) {
      example = (
        <OptInExampleFlyout
          onClose={() => this.setState({ showExample: false })}
          fetchTelemetry={getTelemetryFetcher}
        />
      );
    }
    return showTelemetryOptIn() ? (
      <Fragment>
        {example}
        <EuiSpacer size="m" />
        <EuiText>
          {isStartTrial ? null : 'Gold and platinum customers: help support give you better service.' }
          <EuiCheckbox
            label="Send basic feature usage statistics to Elastic periodically"
            id="isOptingInToTelemetry"
            checked={isOptingInToTelemetry}
            onChange={event => {
              const isOptingInToTelemetry = event.target.checked;
              this.setState({ isOptingInToTelemetry });
            }}
          />
          {showMoreTelemetryInfo ? (
            <EuiText>
              <p>
              This feature periodically sends basic feature usage statistics.<br/>
              This information will not be shared outside of Elastic.<br/>
              See an <EuiLink onClick={() => { this.setState({ showExample: true }); }}>example</EuiLink> or read our
                {' '}
                <EuiLink
                  href={PRIVACY_STATEMENT_URL}
                  target="_blank"
                >
                telemetry privacy statement
                </EuiLink>.<br/>
              You can disable this feature any time.
              </p>
            </EuiText>
          ) : (
            <EuiLink onClick={() => { this.setState({ showMoreTelemetryInfo: !showMoreTelemetryInfo });}}>
              Read more
            </EuiLink>
          )}
        </EuiText>
      </Fragment>
    ) : null;
  }
}