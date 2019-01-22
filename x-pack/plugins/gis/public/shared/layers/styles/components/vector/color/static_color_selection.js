/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiColorPicker,
  EuiFormControlLayout
} from '@elastic/eui';

export class StaticColorSelection extends React.Component {
  render() {

    const onOptionChange = color => {
      this.props.changeOptions({
        color
      });
    };

    return (
      <EuiFormControlLayout>
        <EuiColorPicker
          onChange={onOptionChange}
          color={this.props.selectedOptions ? this.props.selectedOptions.color : null}
          className="gisColorPicker euiFieldText"
        />
      </EuiFormControlLayout>
    );
  }
}
