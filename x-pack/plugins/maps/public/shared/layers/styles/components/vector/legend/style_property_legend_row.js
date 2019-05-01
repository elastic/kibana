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
import { getVectorStyleLabel } from '../get_vector_style_label';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiToolTip,
  EuiHorizontalRule,
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
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
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
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <FillableCircle style={getStyle('4px')}/>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="xs" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FillableCircle style={getStyle('8px')}/>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="xs" />
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
      <EuiSpacer size="xs"/>
      {header}
      <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
        <EuiFlexItem grow={true}>
          <EuiText size="xs">
            <small>{_.get(range, 'min', '')}</small>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="top"
            title={getVectorStyleLabel(name)}
            content={options.field.label}
          >
            <EuiText
              className="eui-textTruncate"
              size="xs"
              style={{ maxWidth: '180px' }}
            >
              <small><strong>{options.field.label}</strong></small>
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiText textAlign="right" size="xs">
            <small>{_.get(range, 'max', '')}</small>
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
