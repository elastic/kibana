/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiForm,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiSwitch,
  EuiSpacer,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { CONFIG_TELEMETRY_DESC, PRIVACY_STATEMENT_URL } from '../../../../common/constants';
import { OptInExampleFlyout } from '../../../components';
import './manage_telemetry_page.less';

export class ManageTelemetryPage extends Component {
  static propTypes = {
    telemetryOptInProvider: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      enabled: props.telemetryOptInProvider.getOptIn(),
      processing: false,
      showExample: false,
    };
  }

  render() {
    const {
      telemetryOptInProvider,
    } = this.props;

    const {
      showExample,
    } = this.state;

    return (
      <EuiPage className="manageTelemetryPage">
        <EuiPageBody restrictWidth>
          <EuiTitle size="l"><h1>Manage usage data</h1></EuiTitle>

          <EuiSpacer />

          {showExample &&
            <OptInExampleFlyout fetchTelemetry={() => telemetryOptInProvider.fetchExample()} onClose={this.toggleExample} />
          }

          <EuiForm>
            <EuiPanel>
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
            </EuiPanel>
          </EuiForm>

        </EuiPageBody>
      </EuiPage>
    );
  }

  toggleOptIn = async () => {
    const newOptInValue = !this.state.enabled;

    this.setState({
      enabled: newOptInValue,
      processing: true
    }, () => {
      this.props.telemetryOptInProvider.setOptIn(newOptInValue).then(() => {
        this.setState({ processing: false });
      }, () => {
        // something went wrong
        this.setState({ processing: false, enabled: !newOptInValue });
      });
    });
  }

  toggleExample = () => {
    this.setState({
      showExample: !this.state.showExample
    });
  }
}
