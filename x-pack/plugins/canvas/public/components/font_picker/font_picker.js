/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiSuperSelect } from '@elastic/eui';
import { fonts } from '@kbn/interpreter/common/lib/fonts';

export const FontPicker = ({ onSelect, value }) => (
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

FontPicker.propTypes = {
  value: PropTypes.string,
  onSelect: PropTypes.func,
};
