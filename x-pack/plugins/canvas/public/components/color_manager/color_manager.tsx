/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { SFC } from 'react';
import tinycolor from 'tinycolor2';
import { ColorDot } from '../color_dot/color_dot';

export interface Props {
  /** The function to call when the Add Color button is clicked. The button will not appear if there is no handler. */
  onAddColor?: (value: string) => void;
  /** The function to call when the value is changed */
  onChange: (value: string) => void;
  /** The function to call when the Remove Color button is clicked. The button will not appear if there is no handler. */
  onRemoveColor?: (value: string) => void;
  /**
   * The value of the color manager. Only honors hexadecimal values.
   * @default ''
   */
  value?: string;
}

export const ColorManager: SFC<Props> = ({ value = '', onAddColor, onRemoveColor, onChange }) => {
  const tc = tinycolor(value);
  const validColor = tc.isValid() && tc.getFormat() === 'hex';

  if (value.length > 0 && !value.startsWith('#')) {
    value = '#' + value;
  }

  const add = (
    <EuiButtonIcon
      aria-label="Add Color"
      iconType="plusInCircle"
      isDisabled={!validColor || !onAddColor}
      onClick={() => onAddColor && onAddColor(value)}
    />
  );

  const remove = (
    <EuiButtonIcon
      aria-label="Remove Color"
      iconType="minusInCircle"
      isDisabled={!validColor || !onRemoveColor}
      onClick={() => onRemoveColor && onRemoveColor(value)}
    />
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <ColorDot value={validColor ? value : 'rgba(255,255,255,0)'} />
      </EuiFlexItem>
      <EuiFlexItem style={{ display: 'inline-block' }}>
        <EuiFieldText
          value={value}
          isInvalid={!validColor && value.length > 0}
          placeholder="#hex color"
          onChange={e => onChange(e.target.value)}
        />
      </EuiFlexItem>
      {(add || remove) && (
        <EuiFlexItem grow={false}>
          {add}
          {remove}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

ColorManager.propTypes = {
  onAddColor: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  onRemoveColor: PropTypes.func,
  value: PropTypes.string,
};
