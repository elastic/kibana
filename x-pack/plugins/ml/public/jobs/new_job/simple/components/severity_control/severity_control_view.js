/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering a severity controls with threshold levels.
 */
import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';

import {
  EuiHealth,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';

import { getSeverityColor } from '../../../../../../common/util/anomaly_utils';

// Move these to shared util?
const OPTIONS = [
  { val: 0, display: 'warning', color: getSeverityColor(0) },
  { val: 25, display: 'minor', color: getSeverityColor(25) },
  { val: 50, display: 'major', color: getSeverityColor(50) },
  { val: 75, display: 'critical', color: getSeverityColor(75) },
];

const optionsMap = {
  'warning': 0,
  'minor': 25,
  'major': 50,
  'critical': 75,
};

function optionValueToThreshold(value) {
  // Get corresponding threshold object with required display and val properties from the specified value.
  let threshold = OPTIONS.find(opt => (opt.val === value));
  // Default to warning if supplied value doesn't map to one of the options.
  if (threshold === undefined) {
    threshold = OPTIONS[0];
  }
  return threshold;
}


export class SeverityControl extends Component {
  constructor(props) {
    super(props);
    this.state = {
      valueDisplay: OPTIONS[3].display,
    };
  }

  getOptions = () =>
    OPTIONS.map(({ color, display, val }) => ({
      value: display,
      inputDisplay: (
        <Fragment>
          <EuiHealth color={color} style={{ lineHeight: 'inherit' }}>
            {display}
          </EuiHealth>
        </Fragment>
      ),
      dropdownDisplay: (
        <Fragment>
          <EuiHealth color={color} style={{ lineHeight: 'inherit' }}>
            {display}
          </EuiHealth>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p className="euiTextColor--subdued">{`score ${val} and above`}</p>
          </EuiText>
        </Fragment>
      ),
    }));

  onChange = (valueDisplay) => {
    this.setState({
      valueDisplay: valueDisplay,
    });
    const threshold = optionValueToThreshold(optionsMap[valueDisplay]);
    this.props.handleThresholdChange(threshold);
  }

  render() {
    const { valueDisplay } = this.state;
    const options = this.getOptions();

    return (
      <EuiSuperSelect
        className="form-control dropdown-toggle"
        hasDividers
        options={options}
        valueOfSelected={valueDisplay}
        onChange={this.onChange}
      />
    );
  }
}

SeverityControl.propTypes = {
  handleThresholdChange: PropTypes.func.isRequired,
};
