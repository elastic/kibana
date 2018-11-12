/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiSuperSelect
} from '@elastic/eui';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { ColorGradient } from '../../../../../icons/color_gradient';


const COLOR_GRADIENTS = Object.keys(vislibColorMaps).map(colorKey => ({
  value: colorKey,
  text: colorKey,
  inputDisplay: <ColorGradient color={colorKey}/>
}));


export class ColorRampSelector extends React.Component {

  constructor() {
    super();
    this.state = {
      selectedColorRamp: null
    };
  }

  _onColorRampSelected = (selectedColorRampString = null) => {
    this.setState({
      selectedColorRamp: selectedColorRampString
    });
    this.props.onChange({
      color: selectedColorRampString
    });
  };

  _getColorRampFromPropsAndState() {
    if (this.state.selectedColorRamp) {
      return this.state.selectedColorRamp;
    }
    if (this.props.selectedOptions && this.props.selectedOptions.color) {
      return this.props.selectedOptions.color;
    } else {
      return null;
    }
  }


  render() {
    const selectedColorRamp = this._getColorRampFromPropsAndState();
    return (
      <EuiSuperSelect
        options={COLOR_GRADIENTS}
        onChange={this._onColorRampSelected}
        valueOfSelected={selectedColorRamp}
        hasDividers={true}
      />);
  }

}
