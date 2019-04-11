/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldNumber,
  EuiSuperSelect,
} from '@elastic/eui';
import { ColorPickerPopover } from '../../../components/color_picker_popover';

const styles = [
  'none',
  'solid',
  'dotted',
  'dashed',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
];

export const BorderForm = ({ value, radius, onChange, colors }) => {
  const border = value || '';
  const [borderWidth = '', borderStyle = '', borderColor = ''] = border.split(' ');
  const borderWidthVal = borderWidth ? borderWidth.replace('px', '') : '';
  const radiusVal = radius ? radius.replace('px', '') : '';

  const namedChange = name => val => {
    if (name === 'borderWidth') {
      return onChange('border', `${val}px ${borderStyle} ${borderColor}`);
    }
    if (name === 'borderStyle') {
      if (val === '') {
        return onChange('border', `0px`);
      }
      return onChange('border', `${borderWidth} ${val} ${borderColor}`);
    }
    if (name === 'borderRadius') {
      return onChange('borderRadius', `${val}px`);
    }

    onChange(name, val);
  };

  const borderColorChange = color => onChange('border', `${borderWidth} ${borderStyle} ${color}`);

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={2}>
        <EuiFormRow label="Thickness" compressed>
          <EuiFieldNumber
            value={Number(borderWidthVal)}
            onChange={e => namedChange('borderWidth')(e.target.value)}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={3}>
        <EuiFormRow label="Style" compressed>
          <EuiSuperSelect
            valueOfSelected={borderStyle || 'none'}
            options={styles.map(style => ({
              value: style,
              inputDisplay: <div style={{ height: 16, border: `4px ${style}` }} />,
            }))}
            onChange={namedChange('borderStyle')}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <EuiFormRow label="Radius" compressed>
          <EuiFieldNumber
            value={Number(radiusVal)}
            onChange={e => namedChange('borderRadius')(e.target.value)}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
        <EuiFormRow label="Color" style={{ fontSize: 0 }}>
          <ColorPickerPopover
            value={borderColor}
            onChange={borderColorChange}
            colors={colors}
            anchorPosition="upCenter"
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

BorderForm.propTypes = {
  value: PropTypes.string,
  radius: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  colors: PropTypes.array.isRequired,
};
