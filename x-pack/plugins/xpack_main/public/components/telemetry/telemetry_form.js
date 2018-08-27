/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiPanel,
  EuiDescribedFormGroup,
  EuiLink,
  EuiFormRow,
  EuiSwitch,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { CONFIG_TELEMETRY_DESC, PRIVACY_STATEMENT_URL } from '../../../common/constants';
import { OptInExampleFlyout } from './opt_in_details_component';
import './telemetry_form.less';

export class TelemetryForm extends Component {
  static propTypes = {
    telemetryOptInProvider: PropTypes.object.isRequired,
  };

  state = {
    processing: false,
    showExample: false,
  }

  render() {
    const {
      telemetryOptInProvider
    } = this.props;

    const {
      showExample
    } = this.state;

    return (
      <Fragment>
        {showExample &&
          <OptInExampleFlyout fetchTelemetry={() => telemetryOptInProvider.fetchExample()} onClose={this.toggleExample} />
        }
        <EuiPanel>
          <div className="telemetryForm">
            <EuiText><h2>Usage Data</h2></EuiText>
            <EuiSpacer />
            <EuiDescribedFormGroup
              idAria="manage-telemetry-aria"
              title={<div />}
              description={
                <Fragment>
                  <p>{CONFIG_TELEMETRY_DESC}</p>
                  <p><EuiLink onClick={this.toggleExample}>See an example of what we collect</EuiLink></p>
                  <p>
                    <EuiLink href={PRIVACY_STATEMENT_URL} target="_blank">
                      Read our usage data privacy statement
                    </EuiLink>
                  </p>
                </Fragment>
              }
            >
              <EuiFormRow hasEmptyLabelSpace={true} describedByIds={['manage-telemetry-aria']}>
                <EuiSwitch
                  label="Send usage data to Elastic"
                  checked={telemetryOptInProvider.getOptIn()}
                  onChange={this.toggleOptIn}
                  disabled={this.state.processing}
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
          </div>
        </EuiPanel>
      </Fragment>
    );
  }

  toggleOptIn = async () => {
    const newOptInValue = !this.props.telemetryOptInProvider.getOptIn();

    this.setState({
      enabled: newOptInValue,
      processing: true
    }, () => {
      this.props.telemetryOptInProvider.setOptIn(newOptInValue).then(() => {
        this.setState({ processing: false });
      }, () => {
        // something went wrong
        this.setState({ processing: false });
      });
    });
  }

  toggleExample = () => {
    this.setState({
      showExample: !this.state.showExample
    });
  }
}