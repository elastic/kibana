/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering a select element with various aggregation interval levels.
 */
import { get } from 'lodash';
import React, { Component } from 'react';

import {
  EuiSelect
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';


const OPTIONS = [
  {
    value: 'auto',
    text: i18n.translate('xpack.ml.controls.selectInterval.autoLabel', { defaultMessage: 'Auto' })
  },
  {
    value: 'hour',
    text: i18n.translate('xpack.ml.controls.selectInterval.hourLabel', { defaultMessage: '1 hour' })
  },
  {
    value: 'day',
    text: i18n.translate('xpack.ml.controls.selectInterval.dayLabel', { defaultMessage: '1 day' })
  },
  {
    value: 'second',
    text: i18n.translate('xpack.ml.controls.selectInterval.showAllLabel', { defaultMessage: 'Show all' })
  }
];

function optionValueToInterval(value) {
  // Builds the corresponding interval object with the required display and val properties
  // from the specified value.
  const option = OPTIONS.find(opt => (opt.value === value));

  // Default to auto if supplied value doesn't map to one of the options.
  let interval = OPTIONS[0];
  if (option !== undefined) {
    interval = { display: option.text, val: option.value };
  }

  return interval;
}

// This service will be populated by the corresponding angularjs based one.
export const mlSelectIntervalService = {
  intialized: false,
  state: null
};

class SelectInterval extends Component {
  constructor(props) {
    super(props);

    // Restore the interval from the state, or default to auto.
    this.mlSelectIntervalService = mlSelectIntervalService;
    const intervalState = this.mlSelectIntervalService.state.get('interval');
    const intervalValue = get(intervalState, 'val', 'auto');
    const interval = optionValueToInterval(intervalValue);
    this.mlSelectIntervalService.state.set('interval', interval);

    this.state = {
      value: interval.val
    };
  }

  onChange = (e) => {
    this.setState({
      value: e.target.value,
    });

    const interval = optionValueToInterval(e.target.value);
    this.mlSelectIntervalService.state.set('interval', interval).changed();
  };

  render() {
    return (
      <EuiSelect
        options={OPTIONS}
        className="ml-select-interval"
        value={this.state.value}
        onChange={this.onChange}
      />
    );
  }
}

export { SelectInterval };
