/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFormRow, EuiFlexItem, EuiFieldNumber, EuiSelect } from '@elastic/eui';
import { ColorPickerMini } from '../../../components/color_picker_mini';

const styles = ['solid', 'dotted', 'dashed', 'double', 'groove', 'ridge', 'inset', 'outset'];

const options = [{ value: '', text: '--' }];
styles.forEach(val => options.push({ value: val, text: val }));

export const BorderForm = ({ value, radius, onChange, colors }) => {
  const border = value || '';
  const [borderWidth = '', borderStyle = '', borderColor = ''] = border.split(' ');
  const borderWidthVal = borderWidth ? borderWidth.replace('px', '') : '';
  const radiusVal = radius ? radius.replace('px', '') : '';

  const namedChange = name => ev => {
    const val = ev.target.value;

    if (name === 'borderWidth') return onChange('border', `${val}px ${borderStyle} ${borderColor}`);
    if (name === 'borderStyle') {
      if (val === '') return onChange('border', `0px`);
      return onChange('border', `${borderWidth} ${val} ${borderColor}`);
    }
    if (name === 'borderRadius') return onChange('borderRadius', `${val}px`);

    onChange(name, ev.target.value);
  };

  const borderColorChange = color => onChange('border', `${borderWidth} ${borderStyle} ${color}`);

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={2}>
        <EuiFormRow label="Width" compressed>
          <EuiFieldNumber value={Number(borderWidthVal)} onChange={namedChange('borderWidth')} />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={3}>
        <EuiFormRow label="Style" compressed>
          <EuiSelect
            defaultValue={borderStyle}
            options={options}
            onChange={namedChange('borderStyle')}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <EuiFormRow label="Radius" compressed>
          <EuiFieldNumber value={Number(radiusVal)} onChange={namedChange('borderRadius')} />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
        <EuiFormRow label="Color" style={{ fontSize: 0 }}>
          <ColorPickerMini
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
