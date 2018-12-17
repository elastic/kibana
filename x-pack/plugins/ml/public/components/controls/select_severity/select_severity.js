/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering a select element with threshold levels.
 */
import PropTypes from 'prop-types';
import _ from 'lodash';
import React, { Component, Fragment } from 'react';

import {
  EuiHealth,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';

import { SEVERITY_OPTIONS } from '../../../../common/util/anomaly_utils';


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

class SelectSeverity extends Component {
  constructor(props) {
    super(props);

    // Restore the threshold from the state, or default to warning.
    this.mlSelectSeverityService = this.props.mlSelectSeverityService;
    const thresholdState = this.mlSelectSeverityService.state.get('threshold');
    const thresholdValue = _.get(thresholdState, 'val', 0);
    const threshold = optionValueToThreshold(thresholdValue);
    // set initial selected option equal to threshold value
    const selectedOption = SEVERITY_OPTIONS.find(opt => (opt.val === threshold.val));
    this.mlSelectSeverityService.state.set('threshold', threshold);

    this.state = {
      valueDisplay: selectedOption.display,
    };
  }

  onChange = (valueDisplay) => {
    this.setState({
      valueDisplay: valueDisplay,
    });
    const threshold = optionValueToThreshold(optionsMap[valueDisplay]);
    this.mlSelectSeverityService.state.set('threshold', threshold).changed();
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

  render() {
    const { valueDisplay } = this.state;
    const options = this.getOptions();

    return (
      <EuiSuperSelect
        hasDividers
        options={options}
        valueOfSelected={valueDisplay}
        onChange={this.onChange}
      />
    );
  }
}

SelectSeverity.propTypes = {
  mlSelectSeverityService: PropTypes.object.isRequired,
};

export { SelectSeverity };
