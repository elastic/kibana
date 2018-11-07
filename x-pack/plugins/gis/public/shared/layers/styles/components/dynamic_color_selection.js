/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiComboBox,
  EuiSuperSelect,
  EuiSpacer
} from '@elastic/eui';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { ColorGradient } from '../../../icons/color_gradient';

export class DynamicColorSelection extends React.Component {

  constructor() {
    super();
    this.state = {
      comboBoxOptions: null,
      selectedColorRamp: null,
      colorGradients: this._getColorGradients()
    };
  }

  _onFieldSelected = (selectedOptions) => {
    this.setState({
      comboBoxOptions: selectedOptions
    });
    const { selectedColorRamp } = this.state;
    if (selectedOptions && selectedOptions.length && selectedColorRamp) {
      this.props.onChange(selectedOptions[0], selectedColorRamp);
    }
  };

  _onColorRampSelected = (selectedColorRampString = null) => {
    this.setState({
      selectedColorRamp: selectedColorRampString
    });
    const { comboBoxOptions } = this.state;
    if (comboBoxOptions && comboBoxOptions.length && selectedColorRampString) {
      this.props.onChange(comboBoxOptions[0], selectedColorRampString);
    }
  };

  _getColorGradients() {
    return Object.keys(vislibColorMaps).map(colorKey => ({
      value: colorKey,
      text: colorKey,
      inputDisplay: <ColorGradient color={colorKey}/>
    }));
  }


  render() {
    const options = this.props.fields.map(field => {
      return { label: field.label, value: field };
    });

    if (this.props.selectedOptions) {
      const { color, fieldValue } = this.props.selectedOptions;
      if (!this.state.comboBoxOptions) {
        const selectedValue = options.find(({ value }) => {
          return value.name === fieldValue.name;
        });
        this.state.comboBoxOptions = selectedValue ? [selectedValue] : [];
      }
      if (!this.state.selectedColorRamp) {
        this.state.selectedColorRamp = color;
      }
    } else {
      this.state.comboBoxOptions = [];
    }

    return (
      <Fragment>
        <EuiComboBox
          selectedOptions={this.state.comboBoxOptions}
          options={options}
          onChange={this._onFieldSelected}
          singleSelection={{}}
          fullWidth
        />
        <EuiSpacer size="m" />
        <EuiSuperSelect
          options={this.state.colorGradients}
          onChange={this._onColorRampSelected}
          valueOfSelected={this.state.selectedColorRamp}
          hasDividers={true}
        />
      </Fragment>
    );
  }
}
