/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering a select element with limit options.
 */
import PropTypes from 'prop-types';
import { get } from 'lodash';
import React, { Component } from 'react';

import {
  EuiSelect,
} from '@elastic/eui';

const optionsMap = {
  '5': 5,
  '10': 10,
  '25': 25,
  '50': 50,
};

const LIMIT_OPTIONS = [
  { val: 5, display: '5' },
  { val: 10, display: '10' },
  { val: 25, display: '25' },
  { val: 50, display: '50' },
];

function optionValueToLimit(value) {
  // Get corresponding limit object with required display and val properties from the specified value.
  let limit = LIMIT_OPTIONS.find(opt => (opt.val === value));

  // Default to 10 if supplied value doesn't map to one of the options.
  if (limit === undefined) {
    limit = LIMIT_OPTIONS[1];
  }

  return limit;
}

// This service will be populated by the corresponding angularjs based one.
export const mlSelectLimitService = {
  initialized: false,
  state: null
};

class SelectLimit extends Component {
  constructor(props) {
    super(props);

    // Restore the limit from the state, or default to 10.
    if (mlSelectLimitService.initialized) {
      this.mlSelectLimitService = mlSelectLimitService;
    }

    this.state = {
      valueDisplay: LIMIT_OPTIONS[1].display,
    };
  }

  componentDidMount() {
    // set initial state from service if available
    if (this.mlSelectLimitService !== undefined) {
      const limitState = this.mlSelectLimitService.state.get('limit');
      const limitValue = get(limitState, 'val', 10);
      const limit = optionValueToLimit(limitValue);
      // set initial selected option equal to limit value
      const selectedOption = LIMIT_OPTIONS.find(opt => (opt.val === limit.val));
      this.mlSelectLimitService.state.set('limit', limit);
      this.setState({ valueDisplay: selectedOption.display, });
    }
  }

  onChange = (e) => {
    const valueDisplay = e.target.value;
    this.setState({ valueDisplay });
    const limit = optionValueToLimit(optionsMap[valueDisplay]);

    if (this.mlSelectLimitService !== undefined) {
      this.mlSelectLimitService.state.set('limit', limit).changed();
    } else {
      this.props.onChangeHandler(limit);
    }
  }

  getOptions = () =>
    LIMIT_OPTIONS.map(({ display, val }) => ({
      value: display,
      text: val,
    }));

  render() {
    return (
      <EuiSelect
        options={this.getOptions()}
        onChange={this.onChange}
        value={this.state.valueDisplay}
      />
    );
  }
}

SelectLimit.propTypes = {
  onChangeHandler: PropTypes.func,
};

SelectLimit.defaultProps = {
  onChangeHandler: () => {},
};

export { SelectLimit };
