/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiLink,
  EuiCheckbox,
  EuiSpacer,
  EuiText,
  EuiPopover
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
  closeReadMorePopover = () => {
    this.setState({ showMoreTelemetryInfo: false });
  }
  onClickReadMore = () => {
    const { showMoreTelemetryInfo } = this.state;
    this.setState({ showMoreTelemetryInfo: !showMoreTelemetryInfo });
  }
  onClickExample = () => {
    this.setState({ showExample: true });
    this.closeReadMorePopover();
  }
  onChangeOptIn = event => {
    const isOptingInToTelemetry = event.target.checked;
    this.setState({ isOptingInToTelemetry });
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

    let toCurrentCustomers;
    if (!isStartTrial) {
      toCurrentCustomers = (
        <Fragment>
          <EuiText>
            <p>Gold and platinum customers: help support give you better service.</p>
          </EuiText>
          <EuiSpacer  size="s"/>
        </Fragment>
      );
    }

    const readMoreButton = (
      <EuiLink onClick={this.onClickReadMore}>
      Read more
      </EuiLink>
    );

    const popover = (
      <EuiPopover
        ownFocus
        id="readMorePopover"
        button={readMoreButton}
        isOpen={showMoreTelemetryInfo}
        closePopover={this.closeReadMorePopover}
        className="eui-AlignBaseline"
      >
        <EuiText className="licManagement__narrowText" >
          <p>
        This feature periodically sends basic feature usage statistics.
        This information will not be shared outside of Elastic.
        See an <EuiLink onClick={this.onClickExample}>example</EuiLink>
            {' '}
          or read our
            {' '}
            <EuiLink
              href={PRIVACY_STATEMENT_URL}
              target="_blank"
            >
          telemetry privacy statement
            </EuiLink>.
        You can disable this feature any time.
          </p>
        </EuiText>
      </EuiPopover>
    );

    return showTelemetryOptIn() ? (
      <Fragment>
        {example}
        {toCurrentCustomers}
        <EuiCheckbox
          label={<span>Send basic feature usage statistics to Elastic periodically. {popover}</span>}
          id="isOptingInToTelemetry"
          checked={isOptingInToTelemetry}
          onChange={this.onChangeOptIn}
        />
      </Fragment>
    ) : null;
  }
}
