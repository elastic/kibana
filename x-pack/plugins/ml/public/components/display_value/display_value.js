/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import {
  EuiToolTip
} from '@elastic/eui';
import { abbreviateWholeNumber } from '../../formatters/abbreviate_whole_number';

const MAX_DIGITS = 9;

export function DisplayValue({ value }) {
  let formattedValue;

  if (Math.abs(value) < Math.pow(10, MAX_DIGITS)) {
    formattedValue = abbreviateWholeNumber(value, MAX_DIGITS);
  } else {
    formattedValue = (
      <EuiToolTip content={value}>
        <span>
          {abbreviateWholeNumber(value, MAX_DIGITS)}
        </span>
      </EuiToolTip>
    );
  }

  return formattedValue;
}
