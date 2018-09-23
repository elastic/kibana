/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiColorPicker
} from '@elastic/eui';

export class StaticColorSelection extends React.Component {
  render() {
    return (<EuiColorPicker
      onChange={this.props.changeColor}
      color={this.props.selectedColor}
    />);
  }
}
