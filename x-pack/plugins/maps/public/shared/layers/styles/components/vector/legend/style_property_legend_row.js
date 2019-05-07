/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
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

function getLineWidthIcons() {
  const defaultStyle = {
    stroke: 'grey',
    fill: 'none',
    width: '12px',
  };
  return [
    <FillableCircle style={{ ...defaultStyle, strokeWidth: '1px' }}/>,
    <FillableCircle style={{ ...defaultStyle, strokeWidth: '2px' }}/>,
    <FillableCircle style={{ ...defaultStyle, strokeWidth: '3px' }}/>,
  ];
}

function getSymbolSizeIcons() {
  const defaultStyle = {
    stroke: 'grey',
    strokeWidth: 'none',
    fill: 'grey',
  };
  return [
    <FillableCircle style={{ ...defaultStyle, width: '4px' }}/>,
    <FillableCircle style={{ ...defaultStyle, width: '8px' }}/>,
    <FillableCircle style={{ ...defaultStyle, width: '12px' }}/>,
  ];
}

function renderHeaderWithIcons(icons) {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
      {
        icons.map((icon, index) => {
          const isLast = index === icons.length - 1;
          let spacer;
          if (!isLast) {
            spacer = (
              <EuiFlexItem>
                <EuiHorizontalRule margin="xs" />
              </EuiFlexItem>
            );
          }
          return (
            <Fragment key={index}>
              <EuiFlexItem grow={false}>
                {icon}
              </EuiFlexItem>
              {spacer}
            </Fragment>
          );
        })
      }
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
    header = renderHeaderWithIcons(getLineWidthIcons());
  } else if (name === 'iconSize') {
    header = renderHeaderWithIcons(getSymbolSizeIcons());
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
