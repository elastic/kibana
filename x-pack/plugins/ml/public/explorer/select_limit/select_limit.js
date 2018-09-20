/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering a select element with various aggregation limits.
 */

import React, { Component } from 'react';

import {
  EuiSelect
} from '@elastic/eui';


const OPTIONS = [
  { text: '5', value: '5' },
  { text: '10', value: '10' },
  { text: '25', value: '25' },
  { text: '50', value: '50' }
];

function optionValueToLimit(value) {
  // Builds the corresponding limit object with
  // the required display and val properties
  // from the specified value.
  const option = OPTIONS.find(opt => (opt.value === value));

  // Default to 10 if supplied value doesn't map to one of the options.
  let limit = +OPTIONS[1].value;
  if (option !== undefined) {
    limit = +option.value;
  }

  return limit;
}

class SelectLimit extends Component {
  constructor(props) {
    super(props);

    // Restore the limit from the state, or default to 10.
    this.mlSelectLimitService = this.props.mlSelectLimitService;
    const limitValue = this.mlSelectLimitService.state.get('limit');
    const limit = optionValueToLimit(limitValue);
    this.mlSelectLimitService.state.set('limit', limit);

    this.state = {
      value: limit
    };
  }

  onChange = (e) => {
    this.setState({
      value: e.target.value,
    });

    const limit = optionValueToLimit(e.target.value);
    this.mlSelectLimitService.state.set('limit', +limit).changed();
  };

  render() {
    return (
      <React.Fragment>
        <label htmlFor="selectLimit" className="euiFormLabel">Limit:</label>
        <div style={{ width: '170px', display: 'inline-block' }}>
          <EuiSelect
            id="selectLimit"
            options={OPTIONS}
            className="ml-select-limit"
            value={this.state.value}
            onChange={this.onChange}
          />
        </div>
      </React.Fragment>
    );
  }
}

export { SelectLimit };
