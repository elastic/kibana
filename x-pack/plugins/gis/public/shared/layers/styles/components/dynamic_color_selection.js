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
      comboBoxOptions: null
    };
  }

  render() {

    const options = this.props.fields.map(field => {return { label: field.label, value: field };
    });
    const onChange = (selectedOptions) => {
      this.setState({
        comboBoxOptions: selectedOptions
      });
      if (selectedOptions.length) {
        this.props.onChange(selectedOptions[0]);
      } else {
        this.props.onChange(null);
      }
    };

    if (this.props.selectedOptions && this.props.selectedOptions.fieldValue) {
      if (!this.state.comboBoxOptions) {
        const selectedValue = this.props.fields.find(field => {
          return field.name === this.props.selectedOptions.fieldValue.name;
        });
        this.state.comboBoxOptions = selectedValue ? [selectedValue] : [];
      }
    } else {
      this.state.comboBoxOptions = [];
    }

    return (<EuiComboBox
      selectedOptions={this.state.comboBoxOptions}
      options={options}
      onChange={onChange}
      singleSelection={{}}
      fullWidth
    />);

  }
}
