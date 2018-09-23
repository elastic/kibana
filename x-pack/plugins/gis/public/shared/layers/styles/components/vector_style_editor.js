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
  EuiKeyboardAccessible
} from '@elastic/eui';

export class VectorStyleEditor extends React.Component {

  constructor() {
    super();
  }

  render() {
    let style = this.props.seedStyle;
    if (style === null) {
      const fallbackDescriptor = VectorStyle.createDescriptor(VectorStyle.DEFAULT_COLOR_HEX);
      style = new VectorStyle(fallbackDescriptor);
    }

    const changeColor = (color) => {
      const fillAndOutlineDescriptor = VectorStyle.createDescriptor(color);
      this.props.handleStyleChange(fillAndOutlineDescriptor);
    };
    const selectedColor = style ? style.getHexColor() : VectorStyle.DEFAULT_COLOR_HEX;
    return (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          Fill and outline
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiColorPicker
            onChange={changeColor}
            color={selectedColor}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <p className="kuiText">
            <EuiKeyboardAccessible>
              <a className="kuiLink" onClick={this.props.resetStyle}>
                Reset
              </a>
            </EuiKeyboardAccessible>
          </p>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
