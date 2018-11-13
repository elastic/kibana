/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiRange
} from '@elastic/eui';


const DEFAULT_MIN_SIZE = 1;
const DEFAULT_MAX_SIZE = 100;

export class SizeRangeSelector extends React.Component {

  constructor() {
    super();
  }

  static _sanitizeSliderValue(event) {
    return parseInt(event.target.value, 10);
  }


  _onMinSizeChange = (e) => {
    const minSize = SizeRangeSelector._sanitizeSliderValue(e);
    this.props.onChange({
      minSize: minSize,
      maxSize: typeof this.props.selectedOptions.maxSize === 'number' ? this.props.selectedOptions.maxSize : DEFAULT_MAX_SIZE
    });
  };

  _onMaxSizeChange = (e) => {
    const maxSize = SizeRangeSelector._sanitizeSliderValue(e);
    this.props.onChange({
      minSize: typeof this.props.selectedOptions.minSize === 'number' ? this.props.selectedOptions.minSize : DEFAULT_MIN_SIZE,
      maxSize: maxSize
    });
  };

  render() {

    const minSize = (
      this.props.selectedOptions &&
      typeof this.props.selectedOptions.minSize === 'number'
    ) ? this.props.selectedOptions.minSize : DEFAULT_MIN_SIZE;
    const maxSize = (
      this.props.selectedOptions &&
      typeof this.props.selectedOptions.maxSize === 'number'
    ) ? this.props.selectedOptions.maxSize : DEFAULT_MAX_SIZE;

    return (
      <EuiFormRow>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label="Min size"
              compressed
            >
              <EuiRange
                min={DEFAULT_MIN_SIZE}
                max={DEFAULT_MAX_SIZE}
                value={minSize.toString()}
                onChange={this._onMinSizeChange}
                showInput
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label="Max size"
              compressed
            >
              <EuiRange
                min={DEFAULT_MIN_SIZE}
                max={DEFAULT_MAX_SIZE}
                value={maxSize.toString()}
                onChange={this._onMaxSizeChange}
                showInput
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }

}
