/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiComboBox } from '@elastic/eui';

export const ESFieldsSelect = ({ selected, fields, onChange, onFocus, onBlur }) => {
  const options = fields.map((value) => ({
    label: value,
  }));

  const selectedOptions = selected.map((value) => ({
    label: value,
  }));

  return (
    <EuiComboBox
      selectedOptions={selectedOptions}
      options={options}
      onChange={(values) => onChange(values.map(({ label }) => label))}
      className="canvasFieldsSelect"
      onFocus={onFocus}
      onBlur={onBlur}
      compressed
    />
  );
};

ESFieldsSelect.propTypes = {
  onChange: PropTypes.func,
  selected: PropTypes.array,
  fields: PropTypes.array,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
};

ESFieldsSelect.defaultProps = {
  selected: [],
  fields: [],
};
