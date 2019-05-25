/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { FunctionComponent } from 'react';
import tinycolor from 'tinycolor2';
import { ColorDot } from '../color_dot/color_dot';

export interface Props {
  /** The function to call when the Add Color button is clicked. The button will be disabled if there is no handler. */
  onAddColor?: (value: string) => void;
  /** The function to call when the value is changed */
  onChange: (value: string) => void;
  /** The function to call when the Remove Color button is clicked. The button will be disabled if there is no handler. */
  onRemoveColor?: (value: string) => void;
  /**
   * Determines if the add/remove buttons are displayed.
   * @default false
   */
  hasButtons?: boolean;
  /**
   * The value of the color manager. Only honors valid CSS values.
   * @default ''
   */
  value?: string;
}

export const ColorManager: FunctionComponent<Props> = ({
  value = '',
  onAddColor,
  onRemoveColor,
  onChange,
  hasButtons = false,
}) => {
  const tc = tinycolor(value);
  const validColor = tc.isValid();

  let buttons = null;

  if (hasButtons) {
    buttons = (
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label="Add Color"
          iconType="plusInCircle"
          isDisabled={!validColor || !onAddColor}
          onClick={() => onAddColor && onAddColor(value)}
        />
        <EuiButtonIcon
          aria-label="Remove Color"
          iconType="minusInCircle"
          isDisabled={!validColor || !onRemoveColor}
          onClick={() => onRemoveColor && onRemoveColor(value)}
        />
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <ColorDot value={validColor ? value : undefined} />
      </EuiFlexItem>
      <EuiFlexItem style={{ display: 'inline-block' }}>
        {/* While the label indicates only hex values are honored, it can accept CSS values. */}
        <EuiFieldText
          value={value}
          isInvalid={!validColor && value.length > 0}
          placeholder="Color code"
          onChange={e => onChange(e.target.value)}
        />
      </EuiFlexItem>
      {buttons}
    </EuiFlexGroup>
  );
};

ColorManager.propTypes = {
  hasButtons: PropTypes.bool,
  onAddColor: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  onRemoveColor: PropTypes.func,
  value: PropTypes.string,
};
