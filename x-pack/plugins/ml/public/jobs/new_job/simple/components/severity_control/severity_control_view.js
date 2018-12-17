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

import { SEVERITY_OPTIONS } from '../../../../../../common/util/anomaly_utils';


const optionsMap = {
  'warning': 0,
  'minor': 25,
  'major': 50,
  'critical': 75,
};

function optionValueToThreshold(value) {
  // Get corresponding threshold object with required display and val properties from the specified value.
  let threshold = SEVERITY_OPTIONS.find(opt => (opt.val === value));
  // Default to warning if supplied value doesn't map to one of the options.
  if (threshold === undefined) {
    threshold = SEVERITY_OPTIONS[0];
  }
  return threshold;
}


export class SeverityControl extends Component {
  constructor(props) {
    super(props);
    this.state = {
      valueDisplay: SEVERITY_OPTIONS[3].display,
    };
  }

  getOptions = () =>
    SEVERITY_OPTIONS.map(({ color, display, val }) => ({
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
