/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import { styleOptionShapes } from '../style_option_shapes';
import { rangeShape } from './vector_style_legend';
import { VectorStyle } from '../../../vector_style';
import { ColorGradient } from '../../../../../icons/color_gradient';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';

export function StylePropertyLegendRow({ name, type, options, range }) {
  if (type === VectorStyle.STYLE_TYPE.STATIC ||
      !options.field || !options.field.name) {
    return null;
  }

  let header;
  if (options.color) {
    header = <ColorGradient color={options.color}/>;
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
        <EuiFlexItem>
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
  options: PropTypes.oneOf(styleOptionShapes).isRequired,
  range: rangeShape,
};
