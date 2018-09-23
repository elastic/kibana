/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { VectorStyle } from '../vector_style';
import { DynamicColorSelection } from './dynamic_color_selection';
import { StaticColorSelection } from './static_color_selection';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonToggle
} from '@elastic/eui';


export class VectorStyleEditor extends React.Component {

  constructor() {
    super();
    this.state = {
      type: VectorStyle.STYLE_TYPE.STATIC,
      ordinalFields: null
    };
    this._lastStaticColor = null;
  }

  _isDynamic() {
    return this.state.type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  async _loadOrdinalFields() {
    const ordinalFields = await this.props.layer.getOrdinalFields();
    this.setState({
      ordinalFields: ordinalFields
    });
  }

  _renderFillAndOutlineStyle(vectorStyle) {

    if (this.state.ordinalFields === null) {
      this._loadOrdinalFields();
    }

    const changeToStaticColor = (color) => {
      const vectorStyleDescriptor = VectorStyle.createDescriptor({
        type: VectorStyle.STYLE_TYPE.STATIC,
        options: {
          color: color
        }
      });
      this.props.handleStyleChange(vectorStyleDescriptor);
    };

    const changeToDynamicColor = (field) => {
      const vectorStyleDescriptor = VectorStyle.createDescriptor({
        type: VectorStyle.STYLE_TYPE.DYNAMIC,
        options: {
          field: field
        }
      });
      this.props.handleStyleChange(vectorStyleDescriptor);
    };

    const onTypeToggle = (e) => {
      const selectedStyle = e.target.checked ? VectorStyle.STYLE_TYPE.DYNAMIC : VectorStyle.STYLE_TYPE.STATIC;
      if (selectedStyle === VectorStyle.STYLE_TYPE.STATIC) {
        changeToStaticColor(this._lastStaticColor);
      } else {
        changeToDynamicColor();
      }
      this.setState({
        type: selectedStyle
      });
    };

    const selectedColor = vectorStyle ? vectorStyle.getHexColorForFillAndOutline() : VectorStyle.DEFAULT_COLOR_HEX;
    this._lastStaticColor = selectedColor;

    let colorSelector;
    if (this._isDynamic()) {
      if (this.state.ordinalFields !== null) {
        colorSelector = (<DynamicColorSelection fields={this.state.ordinalFields} onChange={changeToDynamicColor} />);
      } else {
        colorSelector = null;
      }
    } else {
      colorSelector = (<StaticColorSelection changeColor={changeToStaticColor} selectedColor={selectedColor}/>);
    }

    return (
      <Fragment>
        <EuiFlexItem grow={false}>
          Fill and outline color
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          < EuiButtonToggle
            label={this._isDynamic() ? 'Dynamic' : 'Static'
            }
            onChange={onTypeToggle}
            isSelected={this._isDynamic()
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {colorSelector}
        </EuiFlexItem>
      </Fragment>
    );
  }

  render() {
    let style = this.props.seedStyle;
    if (style === null) {
      const fallbackDescriptor = VectorStyle.createDescriptor(VectorStyle.DEFAULT_COLOR_HEX);
      style = new VectorStyle(fallbackDescriptor);
    }
    return (
      <EuiFlexGroup alignItems="center">
        {this._renderFillAndOutlineStyle(style)}
      </EuiFlexGroup>
    );
  }

}



