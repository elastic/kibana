/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { VectorStyle } from '../vector_style';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiColorPicker,
  EuiButtonToggle
} from '@elastic/eui';


const STYLE_TYPE = {
  'DYNAMIC': 'Dynamic',
  'STATIC': 'Static'
};

export class VectorStyleEditor extends React.Component {

  constructor() {
    super();
    this.state = {
      type: STYLE_TYPE.STATIC
    };
  }

  _isDynamic() {
    return this.state.type === STYLE_TYPE.DYNAMIC;
  }

  render() {
    let style = this.props.seedStyle;
    if (style === null) {
      const fallbackDescriptor = VectorStyle.createDescriptor(VectorStyle.DEFAULT_COLOR_HEX);
      style = new VectorStyle(fallbackDescriptor);
    }

    const onToggleChange = (e) => {
      this.setState({
        type: e.target.checked ? STYLE_TYPE.DYNAMIC : STYLE_TYPE.STATIC
      });
    };

    const changeColor = (color) => {
      const fillAndOutlineDescriptor = VectorStyle.createDescriptor(color);
      this.props.handleStyleChange(fillAndOutlineDescriptor);
    };
    const selectedColor = style ? style.getHexColor() : VectorStyle.DEFAULT_COLOR_HEX;

    const ColorSelector = this._isDynamic() ? (<DynamicColorSelection/>) :
(<StaticColorSelection changeColor={changeColor} selectedColor={selectedColor} />);
    return (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          Fill and outline
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonToggle
            label={this._isDynamic() ? 'Dynamic' : 'Static'}
            onChange={onToggleChange}
            isSelected={this._isDynamic()}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {ColorSelector}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}


class StaticColorSelection extends React.Component {
  render() {
    return (<EuiColorPicker
      onChange={this.props.changeColor}
      color={this.props.selectedColor}
    />);
  }
}


class DynamicColorSelection extends React.Component {
  render() {
    return 'here be dynamic color selection';
  }
}
