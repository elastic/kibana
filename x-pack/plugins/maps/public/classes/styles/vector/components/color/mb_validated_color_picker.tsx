/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { isValidHex, EuiColorPicker, EuiFormControlLayoutProps } from '@elastic/eui';

export const RGBA_0000 = 'rgba(0,0,0,0)';

interface Props {
  onChange: (color: string) => void;
  color: string;
  swatches?: string[];
  append?: EuiFormControlLayoutProps['append'];
}

interface State {
  colorInputValue: string;
}

// EuiColorPicker treats '' or invalid colors as transparent.
// Mapbox logs errors for '' or invalid colors.
// MbValidatedColorPicker is a wrapper around EuiColorPicker that reconciles the behavior difference
// between the two by returning a Mapbox safe RGBA_0000 for '' or invalid colors
// while keeping invalid state local so EuiColorPicker's input properly handles text input.
export class MbValidatedColorPicker extends Component<Props, State> {
  state = {
    colorInputValue: this.props.color === RGBA_0000 ? '' : this.props.color,
  };

  _onColorChange = (color: string) => {
    // reflect all user input, whether valid or not
    this.setState({ colorInputValue: color });
    // Only surface mapbox valid input to caller
    this.props.onChange(isValidHex(color) ? color : RGBA_0000);
  };

  render() {
    return (
      <EuiColorPicker
        onChange={this._onColorChange}
        color={this.state.colorInputValue}
        swatches={this.props.swatches}
        append={this.props.append}
        compressed
      />
    );
  }
}
