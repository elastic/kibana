/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { SFC } from 'react';
import tinycolor from 'tinycolor2';
import { ColorManager } from '../color_manager';
import { ColorPalette } from '../color_palette';

export interface Props {
  /**
   * An array of hexadecimal color values. Non-hex will be ignored.
   * @default []
   */
  colors?: string[];
  /** The function to call when the Add Color button is clicked. The button will not appear if there is no handler. */
  onAddColor?: (value: string) => void;
  /** The function to call when the color is changed. */
  onChange: (value: string) => void;
  /** The function to call when the Remove Color button is clicked. The button will not appear if there is no handler. */
  onRemoveColor?: (value: string) => void;
  /**
   * The value of the color in the selector. Should be hexadecimal. If it is not in the colors array, it will be ignored.
   * @default ''
   */
  value?: string;
}

export const ColorPicker: SFC<Props> = ({
  colors = [],
  value = '',
  onAddColor,
  onChange,
  onRemoveColor,
}) => {
  const tc = tinycolor(value);
  const isValidColor = tc.isValid() && tc.getFormat() === 'hex';

  colors = colors.filter(color => {
    const providedColor = tinycolor(color);
    return providedColor.isValid() && providedColor.getFormat() === 'hex';
  });

  let canRemove = false;
  let canAdd = false;

  if (isValidColor) {
    const match = colors.filter(color => tinycolor.equals(value, color));
    canRemove = match.length > 0;
    canAdd = match.length === 0;
  }

  return (
    <div>
      <ColorPalette onChange={onChange} value={value} colors={colors} />
      <ColorManager
        onChange={onChange}
        value={value}
        onAddColor={canAdd ? onAddColor : undefined}
        onRemoveColor={canRemove ? onRemoveColor : undefined}
      />
    </div>
  );
};

ColorPicker.propTypes = {
  colors: PropTypes.array,
  onAddColor: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  onRemoveColor: PropTypes.func,
  value: PropTypes.string,
};
