/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiSuperSelect } from '@elastic/eui';
import { fonts } from '../../../common/lib/fonts';

export const FontPicker = ({ onSelect, value }) => {
  if (value && !fonts.find(font => font.value === value)) {
    const label = (value.indexOf(',') >= 0 ? value.split(',')[0] : value).replace(/['"]/g, '');
    fonts.push({ value, label });
    fonts.sort((a, b) => a.label.localeCompare(b.label));
  }

  return (
    <EuiSuperSelect
      compressed
      options={fonts.map(({ value, label }) => ({
        value,
        inputDisplay: <div style={{ fontFamily: value }}>{label}</div>,
      }))}
      valueOfSelected={value}
      onChange={value => onSelect(value)}
    />
  );
};

FontPicker.propTypes = {
  value: PropTypes.string,
  onSelect: PropTypes.func,
};
