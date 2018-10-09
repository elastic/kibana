/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiComboBox
} from '@elastic/eui';

export class DynamicColorSelection extends React.Component {

  constructor() {
    super();
    this.state = {
      selectedOptions: []
    };
  }

  render() {
    const options = this.props.fields.map(field => {
      return { label: field.label, value: field };
    });
    const onChange = (selectedOptions) => {
      this.setState({
        selectedOptions: selectedOptions
      });
      if (selectedOptions.length) {
        this.props.onChange(selectedOptions[0]);
      } else {
        this.props.onChange(null);
      }
    };

    return (<EuiComboBox
      selectedOptions={this.state.selectedOptions}
      options={options}
      onChange={onChange}
      singleSelection={{}}
    />);

  }
}
