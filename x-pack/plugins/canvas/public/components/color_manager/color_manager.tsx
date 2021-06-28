/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonIcon, EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import tinycolor from 'tinycolor2';
import { i18n } from '@kbn/i18n';

import { ColorDot } from '../color_dot/color_dot';

const strings = {
  getAddAriaLabel: () =>
    i18n.translate('xpack.canvas.colorManager.addAriaLabel', {
      defaultMessage: 'Add Color',
    }),
  getCodePlaceholder: () =>
    i18n.translate('xpack.canvas.colorManager.codePlaceholder', {
      defaultMessage: 'Color code',
    }),
  getRemoveAriaLabel: () =>
    i18n.translate('xpack.canvas.colorManager.removeAriaLabel', {
      defaultMessage: 'Remove Color',
    }),
};

export interface Props {
  /**
   * Determines if the add/remove buttons are displayed.
   * @default false
   */
  hasButtons?: boolean;
  /** The function to call when the Add Color button is clicked. The button will be disabled if there is no handler. */
  onAddColor?: (value: string) => void;
  /** The function to call when the value is changed */
  onChange: (value: string) => void;
  /** The function to call when the Remove Color button is clicked. The button will be disabled if there is no handler. */
  onRemoveColor?: (value: string) => void;
  /**
   * The value of the color manager. Only honors valid CSS values.
   * @default ''
   */
  value?: string;
}

export const ColorManager: FC<Props> = ({
  hasButtons = false,
  onAddColor,
  onChange,
  onRemoveColor,
  value = '',
}) => {
  const tc = tinycolor(value);
  const validColor = tc.isValid();

  let buttons = null;

  if (hasButtons) {
    buttons = (
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label={strings.getAddAriaLabel()}
          iconType="plusInCircle"
          isDisabled={!validColor || !onAddColor}
          onClick={() => onAddColor && onAddColor(value)}
        />
        <EuiButtonIcon
          aria-label={strings.getRemoveAriaLabel()}
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
          placeholder={strings.getCodePlaceholder()}
          onChange={(e) => onChange(e.target.value)}
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
