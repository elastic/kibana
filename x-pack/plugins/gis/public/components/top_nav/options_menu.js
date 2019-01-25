/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiForm,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';

export function OptionsMenu({ isDarkTheme, onDarkThemeChange }) {

  const handleDarkThemeChange = (evt) => {
    onDarkThemeChange(evt.target.checked);
  };

  return (
    <EuiForm
      data-test-subj="gisOptionsMenu"
    >
      <EuiFormRow>
        <EuiSwitch
          label="Use dark theme"
          checked={isDarkTheme}
          onChange={handleDarkThemeChange}
        />
      </EuiFormRow>
    </EuiForm>
  );
}

OptionsMenu.propTypes = {
  isDarkTheme: PropTypes.bool.isRequired,
  onDarkThemeChange: PropTypes.func.isRequired,
};
