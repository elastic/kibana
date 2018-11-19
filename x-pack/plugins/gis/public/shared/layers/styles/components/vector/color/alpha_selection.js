/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiRange, EuiFormRow } from '@elastic/eui';

export function AlphaSelection({ alphaValue, onAlphaValueChange }) {
  const onChange = e => {
    const sanitizedValue = parseFloat(e.target.value);
    onAlphaValueChange(isNaN(sanitizedValue) ? '' : sanitizedValue);
  };
  return(
    <EuiFormRow label="Layer opacity">
      <div className="alphaRange">
        <EuiRange
          min={.00}
          max={1.00}
          step={.01}
          value={alphaValue.toString()} // EuiRange value must be string
          onChange={onChange}
          showLabels
          showInput
          showRange
        />
      </div>
    </EuiFormRow>
  );
}
