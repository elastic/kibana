/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiRange } from '@elastic/eui';

export class AlphaSelection extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      alphaValue: props.alphaValue || 1.0
    };
  }

  componentDidUpdate() {
    const { alphaValue } = this.props;
    if (alphaValue !== this.state.alphaValue) {
      this.setState({
        alphaValue
      });
    }
  }

  _changeAlphaValue({ value }) {
    this.setState({ alphaValue: +value });
    this.props.changeAlphaValue(+value);
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