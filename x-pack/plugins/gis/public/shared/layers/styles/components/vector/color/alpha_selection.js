/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiRange } from '@elastic/eui';

export class AlphaSelection extends React.Component {

  constructor() {
    super();
    this.state = {
      alphaValue: 0.1 //TODO: Init from store
    };
  }

  _changeAlphaValue({ value }) {
    const { handlePropertyChange, styleProperty } = this.props;
    this.setState({ alphaValue: value });
  }

  render() {
    return(
      <div className="alphaRange">
        <EuiRange
          id={`${this.props.name} alpha range`}
          min={.00}
          max={1.00}
          step={.01}
          value={this.state.alphaValue}
          onChange={({ target }) => {
            this._changeAlphaValue(target);
          }}
          aria-label="Use aria labels when no actual label is in use"
          name={`${this.props.name} alpha range`}
          showLabels
          showInput
          showRange
        />
      </div>
    );
  }
}