/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
} from '@elastic/eui';

import { StaticDynamicStyleSelector } from '../../static_dynamic_styling_option';
import  { DynamicSizeSelection } from './dynamic_size_selection';
import  { StaticSizeSelection } from './static_size_selection';

export class VectorStyleSizeEditor extends React.Component {


  constructor() {
    super();
    this.state = {};
  }

  render() {
    return (<StaticDynamicStyleSelector
      layer={this.props.layer}
      property={this.props.styleProperty}
      name={this.props.stylePropertyName}
      styleDescriptor={this.props.styleDescriptor}
      handlePropertyChange={this.props.handlePropertyChange}
      DynamicSelector={DynamicSizeSelection}
      StaticSelector={StaticSizeSelection}
    />);
  }
}
