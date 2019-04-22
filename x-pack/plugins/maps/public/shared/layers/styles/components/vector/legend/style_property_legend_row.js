/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import { styleOptionShapes, rangeShape } from '../style_option_shapes';
import { VectorStyle } from '../../../vector_style';
import { ColorGradient } from '../../../../../icons/color_gradient';
import { FillableCircle } from '../../../../../icons/additional_layer_icons';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';

function renderLineWidthHeader() {
  function getStyle(strokeWidth) {
    return {
      stroke: 'grey',
      strokeWidth,
      fill: 'none',
      width: '12px',
    };
  }

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <FillableCircle style={getStyle('1px')}/>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FillableCircle style={getStyle('2px')}/>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FillableCircle style={getStyle('3px')}/>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function renderSymbolSizeHeader() {
  function getStyle(width) {
    return {
      stroke: 'grey',
      strokeWidth: 'none',
      fill: 'grey',
      width,
    };
  }

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <FillableCircle style={getStyle('4px')}/>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FillableCircle style={getStyle('8px')}/>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FillableCircle style={getStyle('12px')}/>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function StylePropertyLegendRow({ name, type, options, range }) {
  if (type === VectorStyle.STYLE_TYPE.STATIC ||
      !options.field || !options.field.name) {
    return null;
  }

  let header;
  if (options.color) {
    header = <ColorGradient color={options.color}/>;
  } else if (name === 'lineWidth') {
    header = renderLineWidthHeader();
  } else if (name === 'iconSize') {
    header = renderSymbolSizeHeader();
  }

  return (
    <div>
      {header}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {_.get(range, 'min', '')}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {options.field.label}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {_.get(range, 'max', '')}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

StylePropertyLegendRow.propTypes = {
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  options: PropTypes.oneOfType(styleOptionShapes).isRequired,
  range: rangeShape,
};
