/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { VectorStyle } from '../vector_style';
import { DynamicColorSelection } from './dynamic_color_selection';
import { StaticColorSelection } from './static_color_selection';

import {
  EuiFlexGroup,
  EuiFlexItem,
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

    const changeToStaticColor = (color) => {
      const vectorStyleDescriptor = VectorStyle.createDescriptor(color);
      this.props.handleStyleChange(vectorStyleDescriptor);
    };
    const selectedColor = style ? style.getHexColor() : VectorStyle.DEFAULT_COLOR_HEX;

    const ColorSelector = this._isDynamic() ? (<DynamicColorSelection/>) :
      (<StaticColorSelection changeColor={changeToStaticColor} selectedColor={selectedColor} />);
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



