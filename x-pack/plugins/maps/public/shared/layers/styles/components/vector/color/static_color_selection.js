/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiColorPicker,
  EuiFormControlLayout
} from '@elastic/eui';

export function StaticColorSelection({ onChange, styleOptions }) {
  const onColorChange = color => {
    onChange({ color });
  };

  return (
    <EuiFormControlLayout>
      <EuiColorPicker
        onChange={onColorChange}
        color={styleOptions.color}
        className="mapColorPicker euiFieldText"
      />
    </EuiFormControlLayout>
  );
}

StaticColorSelection.propTypes = {
  styleOptions: PropTypes.shape({
    color: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired
};
