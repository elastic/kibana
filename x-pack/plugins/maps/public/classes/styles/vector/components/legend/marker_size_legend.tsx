/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import _ from 'lodash';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { RangeFieldMeta } from '../../../../../../common/descriptor_types';
import { DynamicSizeProperty } from '../../properties/dynamic_size_property';
import { RightAlignedText } from './right_aligned_text';

const FONT_SIZE = 10;
const HALF_FONT_SIZE = FONT_SIZE / 2;
const MIN_MARKER_DISTANCE = (FONT_SIZE + 2) / 2;

const EMPTY_VALUE = '';

interface Props {
  style: DynamicSizeProperty;
}

interface State {
  label: string;
  maxLabelWidth: number;
  fieldMeta: RangeFieldMeta | null;
}

export class MarkerSizeLegend extends Component<Props, State> {
  private _isMounted: boolean = false;

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    const nextFieldMeta = nextProps.style.getRangeFieldMeta();
    return !_.isEqual(nextFieldMeta, prevState.fieldMeta)
      ? {
          maxLabelWidth: 0,
          fieldMeta: nextFieldMeta,
        }
      : null;
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      label: EMPTY_VALUE,
      maxLabelWidth: 0,
      fieldMeta: this.props.style.getRangeFieldMeta(),
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadLabel();
  }

  componentDidUpdate() {
    this._loadLabel();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadLabel() {
    const field = this.props.style.getField();
    if (!field) {
      return;
    }
    const label = await field.getLabel();
    if (this._isMounted && this.state.label !== label) {
      this.setState({ label });
    }
  }

  _formatValue(value: string | number) {
    return value === EMPTY_VALUE ? value : this.props.style.formatField(value);
  }

  _onRightAlignedWidthChange = (width: number) => {
    if (width > this.state.maxLabelWidth) {
      this.setState({ maxLabelWidth: width });
    }
  };

  _renderMarkers() {
    const fieldMeta = this.state.fieldMeta;
    const options = this.props.style.getOptions();
    if (!fieldMeta || !options) {
      return null;
    }
    const invert = options.invert === undefined ? false : options.invert;

    const circleStyle = {
      fillOpacity: 0,
      stroke: euiThemeVars.euiTextColor,
      strokeWidth: 1,
    };

    const svgHeight = options.maxSize * 2 + HALF_FONT_SIZE + circleStyle.strokeWidth * 2;
    const circleCenterX = options.maxSize + circleStyle.strokeWidth;
    const circleBottomY = svgHeight - circleStyle.strokeWidth;

    const makeMarker = (radius: number, formattedValue: string | number) => {
      const circleCenterY = circleBottomY - radius;
      const circleTopY = circleCenterY - radius;
      const textOffset = this.state.maxLabelWidth + HALF_FONT_SIZE;
      return (
        <g key={radius}>
          <line
            style={{ stroke: euiThemeVars.euiBorderColor }}
            x1={circleCenterX}
            y1={circleTopY}
            x2={circleCenterX * 2.25}
            y2={circleTopY}
          />
          <RightAlignedText
            setWidth={this._onRightAlignedWidthChange}
            style={{ fontSize: FONT_SIZE, fill: euiThemeVars.euiTextColor }}
            x={circleCenterX * 2.25 + textOffset}
            y={circleTopY + HALF_FONT_SIZE}
            value={formattedValue}
          />
          <circle style={circleStyle} cx={circleCenterX} cy={circleCenterY} r={radius} />
        </g>
      );
    };

    function getMarkerRadius(percentage: number) {
      const delta = options.maxSize - options.minSize;
      return percentage * delta + options.minSize;
    }

    function getValue(percentage: number) {
      // Markers interpolated by area instead of radius to be more consistent with how the human eye+brain perceive shapes
      // and their visual relevance
      // This function mirrors output of maplibre expression created from DynamicSizeProperty.getMbSizeExpression
      const scaledWidth = Math.pow(percentage * Math.sqrt(fieldMeta!.delta), 2);
      const value = invert ? fieldMeta!.max - scaledWidth : scaledWidth + fieldMeta!.min;
      return fieldMeta!.delta > 3 ? Math.round(value) : value;
    }

    const markers = [];

    if (fieldMeta.delta > 0) {
      const smallestMarker = makeMarker(
        options.minSize,
        this._formatValue(invert ? fieldMeta.max : fieldMeta.min)
      );
      markers.push(smallestMarker);

      const markerDelta = options.maxSize - options.minSize;
      if (markerDelta > MIN_MARKER_DISTANCE * 3) {
        markers.push(makeMarker(getMarkerRadius(0.25), this._formatValue(getValue(0.25))));
        markers.push(makeMarker(getMarkerRadius(0.5), this._formatValue(getValue(0.5))));
        markers.push(makeMarker(getMarkerRadius(0.75), this._formatValue(getValue(0.75))));
      } else if (markerDelta > MIN_MARKER_DISTANCE) {
        markers.push(makeMarker(getMarkerRadius(0.5), this._formatValue(getValue(0.5))));
      }
    }

    const largestMarker = makeMarker(
      options.maxSize,
      this._formatValue(invert ? fieldMeta.min : fieldMeta.max)
    );
    markers.push(largestMarker);

    return (
      <svg height={svgHeight} xmlns="http://www.w3.org/2000/svg">
        {markers}
      </svg>
    );
  }

  render() {
    return (
      <div>
        <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              title={this.props.style.getDisplayStyleName()}
              content={this.state.label}
            >
              <EuiText className="eui-textTruncate" size="xs" style={{ maxWidth: '180px' }}>
                <small>
                  <strong>{this.state.label}</strong>
                </small>
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        {this._renderMarkers()}
      </div>
    );
  }
}
