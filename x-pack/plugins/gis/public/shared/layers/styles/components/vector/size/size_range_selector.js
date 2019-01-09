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

export function SizeRangeSelector({ minSize, maxSize, onChange }) {

  const onSizeChange = (min, max) => {
    onChange({
      minSize: min,
      maxSize: max
    });
  };

  const onMinSizeChange = (e) => {
    const updatedMinSize = parseInt(e.target.value, 10);
    onSizeChange(updatedMinSize, updatedMinSize > maxSize ? updatedMinSize : maxSize);
  };

  const onMaxSizeChange = (e) => {
    const updatedMaxSize = parseInt(e.target.value, 10);
    onSizeChange(updatedMaxSize < minSize ? updatedMaxSize : minSize, updatedMaxSize);
  };


  if (typeof minSize === 'number' && typeof maxSize === 'number') {
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
                value={maxSize.toString()}
                onChange={onMaxSizeChange}
                showInput
                showRange
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  } else {
    onSizeChange(DEFAULT_MIN_SIZE, DEFAULT_MAX_SIZE);
    return null;
  }
}

SizeRangeSelector.propTypes = {
  minSize: PropTypes.number,
  maxSize: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};
