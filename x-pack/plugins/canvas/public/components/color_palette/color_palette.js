/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiIcon, EuiLink } from '@elastic/eui';
import { readableColor } from '../../lib/readable_color';
import { ColorDot } from '../color_dot';
import { ItemGrid } from '../item_grid';

export const ColorPalette = ({ value, colors, colorsPerRow, onChange }) => (
  <div className="canvasColorPalette">
    <ItemGrid items={colors} itemsPerRow={colorsPerRow || 6}>
      {({ item: color }) => (
        <EuiLink
          style={{ fontSize: 0 }}
          key={color}
          onClick={() => onChange(color)}
          className="canvasColorPalette__dot"
        >
          <ColorDot value={color}>
            {color === value && (
              <EuiIcon type="check" className="selected-color" color={readableColor(value)} />
            )}
          </ColorDot>
        </EuiLink>
      )}
    </ItemGrid>
  </div>
);

ColorPalette.propTypes = {
  colors: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  colorsPerRow: PropTypes.number,
};
