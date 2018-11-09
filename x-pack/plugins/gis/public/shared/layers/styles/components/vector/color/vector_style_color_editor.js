/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { StaticDynamicStyleSelector } from '../../static_dynamic_styling_option';
import  { DynamicColorSelection } from './dynamic_color_selection';
import  { StaticColorSelection } from './static_color_selection';
import { EuiRange } from '@elastic/eui';

export class VectorStyleColorEditor extends React.Component {

  constructor() {
    super();
    this.state = {
      alphaValue: 0.1 //TODO: Init from store
    };
  }

  render() {
    return (
      <Fragment>
        <StaticDynamicStyleSelector
          layer={this.props.layer}
          property={this.props.styleProperty}
          name={this.props.stylePropertyName}
          colorStyleDescriptor={this.props.colorStyleDescriptor}
          handlePropertyChange={this.props.handlePropertyChange}
          DynamicSelector={DynamicColorSelection}
          StaticSelector={StaticColorSelection}
        />
        <div className="alphaRange">
          <EuiRange
            id={`${this.props.name} alpha range`}
            min={.00}
            max={1.00}
            step={.01}
            value={this.state.alphaValue}
            onChange={({ target }) => {
              this.setState({ alphaValue: target.value });
              console.log(target.value);
            }}
            aria-label="Use aria labels when no actual label is in use"
            name={`${this.props.name} alpha range`}
            showLabels
            showInput
            showRange
          />
        </div>
      </Fragment>
    );
  }
}