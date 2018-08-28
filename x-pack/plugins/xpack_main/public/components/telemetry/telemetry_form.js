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

const SEARCH_TERMS = ['telemetry', 'usage', 'data', 'usage data'];

export class TelemetryForm extends Component {
  static propTypes = {
    telemetryOptInProvider: PropTypes.object.isRequired,
    query: PropTypes.object,
    onQueryMatchChange: PropTypes.func.isRequired,
  };

  state = {
    processing: false,
    showExample: false,
    queryMatches: null,
  }

  componentWillReceiveProps(nextProps) {
    const {
      query
    } = nextProps;

    const searchTerm = (query.text || '').toLowerCase();
    const searchTermMatches = SEARCH_TERMS.some(term => term.indexOf(searchTerm) >= 0);

    if (searchTermMatches !== this.state.queryMatches) {
      this.setState({
        queryMatches: searchTermMatches
      }, () => {
        this.props.onQueryMatchChange(searchTermMatches);
      });
    }
  }

  render() {
    const {
      telemetryOptInProvider,
    } = this.props;

    const {
      showExample,
      queryMatches,
    } = this.state;

    if (queryMatches !== null && !queryMatches) {
      return null;
    }

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