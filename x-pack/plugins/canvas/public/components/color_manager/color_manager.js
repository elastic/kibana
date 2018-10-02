/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFieldText, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import { ColorDot } from '../color_dot/color_dot';

const ColorManagerUI = ({ value, addColor, removeColor, onChange, intl }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center">
    <EuiFlexItem grow={1}>
      <ColorDot value={value} />
    </EuiFlexItem>
    <EuiFlexItem grow={5} style={{ display: 'inline-block' }}>
      <EuiFieldText
        compressed
        value={value || ''}
        placeholder={intl.formatMessage({
          id: 'xpack.canvas.colorManager.inputPlaceholder',
          defaultMessage: '#hex color',
        })}
        onChange={e => onChange(e.target.value)}
      />
    </EuiFlexItem>
    {(addColor || removeColor) && (
      <EuiFlexItem grow={false}>
        {addColor && (
          <EuiButtonIcon
            aria-label={intl.formatMessage({
              id: 'xpack.canvas.colorManager.addColorButtonAriaLabel',
              defaultMessage: 'Add Color',
            })}
            iconType="plusInCircle"
            onClick={() => addColor(value)}
          />
        )}
        {removeColor && (
          <EuiButtonIcon
            aria-label={intl.formatMessage({
              id: 'xpack.canvas.colorManager.removeColorButtonAriaLabel',
              defaultMessage: 'Remove Color',
            })}
            iconType="minusInCircle"
            onClick={() => removeColor(value)}
          />
        )}
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

ColorManagerUI.propTypes = {
  value: PropTypes.string,
  addColor: PropTypes.func,
  removeColor: PropTypes.func,
  onChange: PropTypes.func.isRequired,
};

export const ColorManager = injectI18n(ColorManagerUI);
