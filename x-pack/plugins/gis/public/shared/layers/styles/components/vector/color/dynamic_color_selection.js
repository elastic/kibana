/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DynamicOrdinalStyleOption, styleTypes } from '../../dynamic_ordinal_styling_option';

export class DynamicColorSelection extends React.Component {

  render() {
    return (
      <DynamicOrdinalStyleOption
        fields={this.props.fields}
        selectedOptions={this.props.selectedOptions}
        type={styleTypes.COLOR_RAMP}
        onChange={this.props.onChange}
      />
    );
  }

}
