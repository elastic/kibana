/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiForm,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';

export class OptionsMenu extends Component {

  state = {
    darkTheme: this.props.darkTheme,
    useMargins: this.props.useMargins,
    hidePanelTitles: this.props.hidePanelTitles,
  }

  handleDarkThemeChange = (evt) => {
    const isChecked = evt.target.checked;
    this.props.onDarkThemeChange(isChecked);
    this.setState({ darkTheme: isChecked });
  }

  render() {
    return (
      <EuiForm
        data-test-subj="dashboardOptionsMenu"
      >

        <EuiFormRow>
          <EuiSwitch
            label="Use dark theme"
            checked={this.state.darkTheme}
            onChange={this.handleDarkThemeChange}
            data-test-subj="dashboardDarkThemeCheckbox"
          />
        </EuiFormRow>

      </EuiForm>
    );
  }
}

OptionsMenu.propTypes = {
  darkTheme: PropTypes.bool.isRequired,
  onDarkThemeChange: PropTypes.func.isRequired,
};
