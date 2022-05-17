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

const MIN_MARKER_DISTANCE = 8; // leave at least 16 pixels between markers to provide space for labels

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

  _renderSize() {
    const fieldMeta = this.props.style.getRangeFieldMeta();
    const options = this.props.style.getOptions();
    console.log('options', options);
    console.log('fieldMeta', fieldMeta);
    if (!fieldMeta || !options) {
      return null;
    }

    const circleStyle = {
      fillOpacity: 0,
      stroke: 'grey',
      strokeWidth: 1,
    };

    const svgStyle = {
      height: `${(options.maxSize * 2) + circleStyle.strokeWidth}`,
      width: '100%',
    };

    const cx = (options.maxSize * 2) + circleStyle.strokeWidth; // put circle center in middle

    function makeMarker(radius: number, formattedValue: string) {
      const diameter = radius * 2;
      console.log('radius', radius);
      console.log('diameter', diameter);
      const circleTopY = (options.maxSize * 2) - diameter;
      return <g>
        <line style={{ stroke: '#D8D8D8' }} x1={cx} y1={circleTopY} x2={(options.maxSize * 2) * 1.75} y2={circleTopY}/>
        <text style={{ fontSize: '12px' }}x={(options.maxSize * 2) * 1.75} y={circleTopY + 6}>{formattedValue}</text>
        <circle style={circleStyle} cx={cx} cy={options.maxSize * 2 - radius } r={radius}/>
      </g>
    }

    function getMarkerRadius(percentage: number) {
      const delta = options.maxSize - options.minSize;
      return (percentage * delta) + options.minSize;
    }

    function getValue(percentage: number) {
      const delta = Math.pow(fieldMeta.max, 2) - Math.pow(fieldMeta.min, 2);
      const value = Math.sqrt(percentage * delta) + fieldMeta.min;
      return delta > 1 ? Math.round(value) : value;
    }

    console.log('smallest', getValue(0));
    console.log('center', getValue(.5));
    console.log('largest', getValue(1));

    const smallestMarker = makeMarker(options.minSize, this._formatValue(fieldMeta.min));
    const largestMarker = makeMarker(options.maxSize, this._formatValue(fieldMeta.max));

    const markerDelta = options.maxSize - options.minSize;
    const centerDiameter = getMarkerRadius(.5);
    const middleMarkers = [];
    if (markerDelta > MIN_MARKER_DISTANCE * 3) {
      middleMarkers.push(makeMarker(getMarkerRadius(.25), this._formatValue(getValue(.25))));
      middleMarkers.push(makeMarker(centerDiameter, this._formatValue(getValue(.5))));
      middleMarkers.push(makeMarker(getMarkerRadius(.75), this._formatValue(getValue(.75))));
    } else if (markerDelta > MIN_MARKER_DISTANCE) {
      middleMarkers.push(makeMarker(centerDiameter, this._formatValue(getValue(.5))));
    }

    return <svg style={svgStyle} xmlns="http://www.w3.org/2000/svg">
          {smallestMarker}
          {middleMarkers}
          {largestMarker}
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
        {this._renderSize()}
      </div>
    );
  }
}
