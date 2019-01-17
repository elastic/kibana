/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiRange
} from '@elastic/eui';

const DEFAULT_MIN_SIZE = 1;
const DEFAULT_MAX_SIZE = 64;

export class SizeRangeSelector extends React.Component {

  _onSizeChange = (min, max) => {
    this.props.onChange({
      minSize: min,
      maxSize: max
    });
  };

  _areSizesValid() {
    return typeof this.props.minSize === 'number' && typeof this.props.maxSize === 'number';
  }

  componentDidMount() {
    if (!this._areSizesValid()) {
      this._onSizeChange(DEFAULT_MIN_SIZE, DEFAULT_MAX_SIZE);
    }
  }

  componentDidUpdate() {
    if (!this._areSizesValid()) {
      this._onSizeChange(DEFAULT_MIN_SIZE, DEFAULT_MAX_SIZE);
    }
  }

  render() {

    if (!this._areSizesValid()) {
      return null;
    }

    const onMinSizeChange = (e) => {
      const updatedMinSize = parseInt(e.target.value, 10);
      this._onSizeChange(updatedMinSize, updatedMinSize > this.props.maxSize ? updatedMinSize : this.props.maxSize);
    };

    const onMaxSizeChange = (e) => {
      const updatedMaxSize = parseInt(e.target.value, 10);
      this._onSizeChange(updatedMaxSize < this.props.minSize ? updatedMaxSize : this.props.minSize, updatedMaxSize);
    };

    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label="Min size"
            compressed
          >
            <EuiRange
              min={DEFAULT_MIN_SIZE}
              max={DEFAULT_MAX_SIZE}
              value={this.props.minSize.toString()}
              onChange={onMinSizeChange}
              showInput
              showRange
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
              value={this.props.maxSize.toString()}
              onChange={onMaxSizeChange}
              showInput
              showRange
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}


SizeRangeSelector.propTypes = {
  minSize: PropTypes.number,
  maxSize: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};
