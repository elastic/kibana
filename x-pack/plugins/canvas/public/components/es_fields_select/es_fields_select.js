import React from 'react';
import PropTypes from 'prop-types';
import { EuiComboBox } from '@elastic/eui';

export const ESFieldsSelect = ({ selected, fields, onChange, onFocus, onBlur }) => {
  const options = fields.map(value => ({
    label: value,
  }));

  const selectedOptions = selected.map(value => ({
    label: value,
  }));

  return (
    <EuiComboBox
      selectedOptions={selectedOptions}
      options={options}
      onChange={values => onChange(values.map(({ label }) => label))}
      className="canvasFieldsSelect"
      onFocus={onFocus}
      onBlur={onBlur}
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
