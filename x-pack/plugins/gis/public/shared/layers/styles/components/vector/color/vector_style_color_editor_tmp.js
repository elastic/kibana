/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StaticDynamicStyleSelector } from '../../static_dynamic_styling_option';
import  { DynamicColorSelection } from './dynamic_color_selection';
import  { StaticColorSelection } from './static_color_selection';

export class VectorStyleColorEditorTmp extends React.Component {

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
      DynamicSelector={DynamicColorSelection}
      StaticSelector={StaticColorSelection}
    />);
  }
}
