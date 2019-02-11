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
} from '@elastic/eui';
import { ValidatedRange } from '../../../../../components/validated_range';
import { DEFAULT_MIN_SIZE, DEFAULT_MAX_SIZE } from '../../../vector_style_defaults';

export function SizeRangeSelector({ minSize, maxSize, onChange }) {

  const onSizeChange = (min, max) => {
    onChange({
      minSize: min,
      maxSize: max
    });
  };

  const onMinSizeChange = (updatedMinSize) => {
    onSizeChange(updatedMinSize, updatedMinSize > maxSize ? updatedMinSize : maxSize);
  };

  const onMaxSizeChange = (updatedMaxSize) => {
    onSizeChange(updatedMaxSize < minSize ? updatedMaxSize : minSize, updatedMaxSize);
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFormRow
          label="Min size"
          compressed
        >
          <ValidatedRange
            min={DEFAULT_MIN_SIZE}
            max={DEFAULT_MAX_SIZE}
            value={minSize}
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
          <ValidatedRange
            min={DEFAULT_MIN_SIZE}
            max={DEFAULT_MAX_SIZE}
            value={maxSize}
            onChange={onMaxSizeChange}
            showInput
            showRange
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

SizeRangeSelector.propTypes = {
  minSize: PropTypes.number.isRequired,
  maxSize: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};
