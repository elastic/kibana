/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiRange
} from '@elastic/eui';

export class StaticSizeSelection extends React.Component {

  constructor() {
    super();
    this.state = {};
  }

  render() {
    const onChange = (event) => {
      const size = parseInt(event.target.value, 10);
      this.props.changeOptions({
        size: size
      });
    };
    const selectedValue = (
      this.props.selectedOptions && typeof this.props.selectedOptions.size === 'number'
    ) ? this.props.selectedOptions.size : 0;
    return (
      <EuiRange
        min={0}
        max={100}
        value={selectedValue.toString()}
        onChange={onChange}
        showInput
      />
    );
  }
}
