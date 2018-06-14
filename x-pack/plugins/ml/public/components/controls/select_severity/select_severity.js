/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering a select element with threshold levels.
 */
import _ from 'lodash';
import React, { Component } from 'react';

import {
  EuiComboBox,
  EuiHighlight,
  EuiHealth,
} from '@elastic/eui';

import { getSeverityColor } from 'plugins/ml/../common/util/anomaly_utils';

const OPTIONS = [
  { value: 0, label: 'warning', color: getSeverityColor(0) },
  { value: 25, label: 'minor', color: getSeverityColor(25) },
  { value: 50, label: 'major', color: getSeverityColor(50) },
  { value: 75, label: 'critical', color: getSeverityColor(75) }
];

function optionValueToThreshold(value) {
  // Builds the corresponding threshold object with the required display and val properties
  // from the specified value.
  const option = OPTIONS.find(opt => (opt.value === value));

  // Default to warning if supplied value doesn't map to one of the options.
  let threshold = OPTIONS[0];
  if (option !== undefined) {
    threshold = { display: option.label, val: option.value };
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
    const selectedOption = OPTIONS.find(opt => (opt.value === threshold.val));

    this.mlSelectSeverityService.state.set('threshold', threshold);

    this.state = {
      selectedOptions: [selectedOption]
    };
  }

  onChange = (selectedOptions) => {
    if (selectedOptions.length === 0) {
      // Don't allow no options to be selected.
      return;
    }

    this.setState({
      selectedOptions,
    });

    const threshold = optionValueToThreshold(selectedOptions[0].value);
    this.mlSelectSeverityService.state.set('threshold', threshold).changed();
  };

  renderOption = (option, searchValue, contentClassName) => {
    const { color, label, value } = option;
    return (
      <EuiHealth color={color}>
        <span className={contentClassName}>
          <EuiHighlight search={searchValue}>
            {label}
          </EuiHighlight>
          &nbsp;
          <span>({value})</span>
        </span>
      </EuiHealth>
    );
  };

  render() {
    const { selectedOptions } = this.state;
    return (
      <EuiComboBox
        placeholder="Select severity"
        className="ml-select-severity"
        singleSelection={true}
        options={OPTIONS}
        selectedOptions={selectedOptions}
        onChange={this.onChange}
        renderOption={this.renderOption}
      />
    );
  }
}

export { SelectSeverity };
