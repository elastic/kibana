/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiColorPicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiKeyboardAccessible,
} from '@elastic/eui';

const DEFAULT_COLOR = '#e6194b';

export class FillAndOutlineStyle {

  static type = 'FILL_AND_OUTLINE';
  static DEFAULT_COLOR_HEX = '#ffffff';

  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === FillAndOutlineStyle;
  }

  static createDescriptor(color) {
    return {
      type: FillAndOutlineStyle.type,
      color: color
    };
  }

  static getDisplayName() {
    return 'Vector Adjustment';
  }

  static renderEditor({ handleStyleChange, style, reset }) {

    if (style === null) {
      const fallbackDescriptor = FillAndOutlineStyle.createDescriptor(FillAndOutlineStyle.DEFAULT_COLOR_HEX);
      style = new FillAndOutlineStyle(fallbackDescriptor);
    }

    const changeColor = (color) => {
      const fillAndOutlineDescriptor = FillAndOutlineStyle.createDescriptor(color);
      handleStyleChange(fillAndOutlineDescriptor);
    };
    const selectedColor = style ? style.getHexColor() : FillAndOutlineStyle.DEFAULT_COLOR_HEX;
    return (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiColorPicker
            onChange={changeColor}
            color={selectedColor}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <p className="kuiText">
            <EuiKeyboardAccessible>
              <a className="kuiLink" onClick={reset}>
                Reset
              </a>
            </EuiKeyboardAccessible>
          </p>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  getHexColor() {
    return this._descriptor.color;
  }


  setMBPaintProperties(mbMap, fillLayerId, lineLayerId, temp) {
    const color = this.getHexColor() || DEFAULT_COLOR;
    mbMap.setPaintProperty(fillLayerId, 'fill-color', color);
    mbMap.setPaintProperty(fillLayerId, 'fill-opacity', temp ? 0.4 : 0.5);
    mbMap.setPaintProperty(lineLayerId, 'line-color', color);
    mbMap.setPaintProperty(lineLayerId, 'line-opacity', temp ? 0.4 : 0.5);
    mbMap.setPaintProperty(lineLayerId, 'line-width', temp ? 1 : 2);
  }


}
