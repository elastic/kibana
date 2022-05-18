/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import _ from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { RangedStyleLegendRow } from '../../../components/ranged_style_legend_row';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { getIsDarkMode } from '../../../../../kibana_services';
import { CircleIcon } from './circle_icon';
import { IDynamicStyleProperty } from '../../properties/dynamic_style_property';

const FONT_SIZE = 10;
const HALF_FONT_SIZE = FONT_SIZE / 2;
const MIN_MARKER_DISTANCE = (FONT_SIZE + 2) / 2;

function getSymbolSizeIcons() {
  const defaultStyle = {
    stroke: 'grey',
    fill: 'grey',
  };
  return [
    <CircleIcon style={{ ...defaultStyle, width: '4px' }} />,
    <CircleIcon style={{ ...defaultStyle, width: '8px' }} />,
    <CircleIcon style={{ ...defaultStyle, width: '12px' }} />,
  ];
}
const EMPTY_VALUE = '';

interface Props {
  style: IDynamicStyleProperty<SizeDynamicOptions>;
}

interface State {
  label: string;
}

export class MarkerSizeLegend extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    label: EMPTY_VALUE,
  };

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
    if (this._isMounted && !_.isEqual(this.state.label, label)) {
      this.setState({ label });
    }
  }

  _formatValue(value: string | number) {
    if (value === EMPTY_VALUE) {
      return value;
    }
    return this.props.style.formatField(value);
  }

  _renderMarkers() {
    const fieldMeta = this.props.style.getRangeFieldMeta();
    const options = this.props.style.getOptions();
    if (!fieldMeta || !options) {
      return null;
    }

    const circleStyle = {
      fillOpacity: 0,
      stroke: 'grey',
      strokeWidth: 1,
    };

    const svgStyle = {
      height: '100%',
      width: '100%',
    };

    const svgHeight = (options.maxSize * 2) + HALF_FONT_SIZE + (circleStyle.strokeWidth * 2);

    const cx = options.maxSize + circleStyle.strokeWidth; // put circle center in middle

    function makeMarker(radius: number, formattedValue: string) {
      const circleBottomY = svgHeight - circleStyle.strokeWidth;
      const circleCenterY = circleBottomY - radius;
      const circleTopY = circleCenterY - radius;
      return <g>
        <line style={{ stroke: '#D8D8D8' }} x1={cx} y1={circleTopY} x2={cx * 2.25} y2={circleTopY}/>
        <text style={{ fontSize: FONT_SIZE }} x={(cx * 2.25) + HALF_FONT_SIZE} y={circleTopY + HALF_FONT_SIZE}>{formattedValue}</text>
        <circle style={circleStyle} cx={cx} cy={circleCenterY} r={radius}/>
      </g>
    }

    function getMarkerRadius(percentage: number) {
      const delta = options.maxSize - options.minSize;
      return (percentage * delta) + options.minSize;
    }

    function getValue(percentage: number) {
      console.log('percentage', percentage);
      const delta = fieldMeta.max - fieldMeta.min;
      const valueAtPercentage = (percentage * delta) + fieldMeta.min;
      
      const sqrtMin = Math.sqrt(fieldMeta.min);
      const sqrtMax = Math.sqrt(fieldMeta.max);
      const sqrtValue = Math.sqrt(valueAtPercentage);
      const sqrtPercentage = sqrtValue / sqrtMax;
      console.log('sqrtPercentage', sqrtPercentage);

      return fieldMeta.max * sqrtPercentage;
    }

    const markers = [];

    if (fieldMeta.delta > 1) {
      const smallestMarker = makeMarker(options.minSize, this._formatValue(fieldMeta.min));
      markers.push(smallestMarker);

      const markerDelta = options.maxSize - options.minSize;
      if (markerDelta > MIN_MARKER_DISTANCE * 3) {
        markers.push(makeMarker(getMarkerRadius(.25), this._formatValue(getValue(.25))));
        markers.push(makeMarker(getMarkerRadius(.5), this._formatValue(getValue(.5))));
        markers.push(makeMarker(getMarkerRadius(.75), this._formatValue(getValue(.75))));
      } else if (markerDelta > MIN_MARKER_DISTANCE) {
        markers.push(makeMarker(getMarkerRadius(.5), this._formatValue(getValue(.5))));
      }
    }

    const largestMarker = makeMarker(options.maxSize, this._formatValue(fieldMeta.max));
    markers.push(largestMarker);

    return <svg height={svgHeight} xmlns="http://www.w3.org/2000/svg">
          {markers}
        </svg>;
  }

  render() {
    return (
      <div>
        <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiToolTip position="top" title={this.props.style.getDisplayStyleName()} content={this.state.label}>
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
