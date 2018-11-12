/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { DynamicOrdinalStyleOption } from '../../dynamic_ordinal_styling_option';
import { SizeRangeSelector } from './size_range_selector';


export class DynamicSizeSelection extends React.Component {

  render() {
    return (
      <DynamicOrdinalStyleOption
        fields={this.props.fields}
        selectedOptions={this.props.selectedOptions}
        DynamicStylingOption={SizeRangeSelector}
        onChange={this.props.onChange}
      />
    );
  }
}
