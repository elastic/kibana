/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiComboBox,
  EuiSpacer
} from '@elastic/eui';

export class DynamicOrdinalStyleOption extends React.Component {

  constructor() {
    super();
    this.state = {
      fieldSelection: null
    };
  }


  _onFieldSelected = (fieldSelection) => {
    this.setState({
      fieldSelection: fieldSelection
    });
    this._fireChange(fieldSelection, {});
  };


  _fireChange(newField, dynamicOptions) {
    let newOptions = { ...this.props.selectedOptions };
    newOptions.field = newField && newField.length ? newField[0].value : this.props.selectedOptions.field;
    newOptions = { ...newOptions, ...dynamicOptions };
    this.props.onChange(newOptions);
  }

  _getComboBoxOptionsFromFields() {
    return this.props.fields.map(field => {
      return { label: field.label, value: field };
    });
    // if (this.props.selectedOptions) {
    //   const { color, field } = this.props.selectedOptions;
    //   if (!this.state.comboBoxOptions && field) {
    //     const selectedValue = options.find(({ value }) => {
    //       return value.name === field.name;
    //     });
    //     this.state.comboBoxOptions = selectedValue ? [selectedValue] : [];
    //   }
    //   if (!this.state.selectedColorRamp && color) {
    //     this.state.selectedColorRamp = color;
    //   }
    //   if (!this.state.comboBoxOptions) this.state.comboBoxOptions = [];
    // } else {
    //   this.state.comboBoxOptions = [];
    // }

  }

  _getFieldSelectionFromPropsAndState(options) {

    if (this.state.fieldSelection) {
      return this.state.fieldSelection;
    }

    if (this.props.selectedOptions) {
      if (this.props.selectedOptions.field) {
        const selectedValue = options.find(({ value }) => {
          return value.name === this.props.selectedOptions.field.name;
        });
        return (selectedValue) ? [selectedValue] : [];
      }
    } else {
      return [];
    }
  }

  render() {
    const DynamicStylingOption = this.props.DynamicStylingOption;
    const onChange = (additionalOptions) => {
      this._fireChange(this.state.fieldSelection, additionalOptions);
    };

    const ordinalFieldComboboxOptions = this._getComboBoxOptionsFromFields();
    const fieldSelection = this._getFieldSelectionFromPropsAndState(ordinalFieldComboboxOptions);

    return (
      <Fragment>
        <EuiComboBox
          selectedOptions={fieldSelection}
          options={ordinalFieldComboboxOptions}
          onChange={this._onFieldSelected}
          singleSelection={{}}
          fullWidth
        />
        <EuiSpacer size="m" />
        <DynamicStylingOption onChange={onChange} selectedOptions={this.props.selectedOptions}/>
      </Fragment>
    );
  }

}



