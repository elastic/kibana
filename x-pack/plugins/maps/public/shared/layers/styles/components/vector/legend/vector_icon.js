/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { dynamicColorShape, staticColorShape } from '../style_option_shapes';
import { ColorableLine, FillableCircle, FillableRectangle } from '../../../../../icons/additional_layer_icons';
import { VectorStyle } from '../../../vector_style';
import { getColorRampCenterColor } from '../../../../../utils/color_utils';

export class VectorIcon extends Component {

  state = {
    isInitialized: false
  }

  componentDidMount() {
    this._isMounted = true;
    this._init();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _init() {
    const isPointsOnly = await this.props.loadIsPointsOnly();
    const isLinesOnly = await this.props.loadIsLinesOnly();
    if (this._isMounted) {
      this.setState({
        isInitialized: true,
        isPointsOnly,
        isLinesOnly,
      });
    }
  }

  render() {
    if (!this.state.isInitialized) {
      return null;
    }

    if (this.state.isLinesOnly) {
      const style = {
        stroke: extractColorFromStyleProperty(this.props.lineColor, 'grey'),
        strokeWidth: '4px',
      };
      return (
        <ColorableLine style={style}/>
      );
    }

    const style = {
      stroke: extractColorFromStyleProperty(this.props.lineColor, 'none'),
      strokeWidth: '1px',
      fill: extractColorFromStyleProperty(this.props.fillColor, 'grey'),
    };

    return this.state.isPointsOnly
      ? <FillableCircle style={style}/>
      : <FillableRectangle style={style}/>;
  }
}

function extractColorFromStyleProperty(colorStyleProperty, defaultColor) {
  if (!colorStyleProperty) {
    return defaultColor;
  }

  if (colorStyleProperty.type === VectorStyle.STYLE_TYPE.STATIC) {
    return colorStyleProperty.options.color;
  }

  // return middle of gradient for dynamic style property
  return getColorRampCenterColor(colorStyleProperty.options.color);
}

const colorStylePropertyShape = PropTypes.shape({
  type: PropTypes.string.isRequired,
  options: PropTypes.oneOfType([
    dynamicColorShape,
    staticColorShape
  ]).isRequired,
});

VectorIcon.propTypes = {
  fillColor: colorStylePropertyShape,
  lineColor: colorStylePropertyShape,
  loadIsPointsOnly: PropTypes.func.isRequired,
  loadIsLinesOnly: PropTypes.func.isRequired,
};
